import * as cdk from "aws-cdk-lib";
import {
  CachePolicy,
  CfnDistribution,
  CfnOriginAccessControl,
  CloudFrontAllowedCachedMethods,
  CloudFrontAllowedMethods,
  CloudFrontWebDistribution,
  OriginRequestPolicy,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { Effect, PolicyStatement, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import {
  ARecord,
  AaaaRecord,
  HostedZone,
  RecordTarget,
} from "aws-cdk-lib/aws-route53";
import { CloudFrontTarget } from "aws-cdk-lib/aws-route53-targets";
import {
  BlockPublicAccess,
  Bucket,
  BucketEncryption,
  ObjectOwnership,
} from "aws-cdk-lib/aws-s3";
import { BucketDeployment, Source } from "aws-cdk-lib/aws-s3-deployment";
import { Construct } from "constructs";
import { websiteConfiguration } from "../config/websiteConfiguration";

const path = "../website/dist//common-ui-components/browser";

interface WebSiteStackProps extends cdk.StackProps {
  certificateArnMap: Map<string, string>; // Add the certificateArnMap to props
}

export class WebSiteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: WebSiteStackProps) {
    super(scope, id, props);

    // Create an S3 bucket to host the static website
    const hostingBucket = new Bucket(this, "/common-ui-components-website", {
      autoDeleteObjects: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      encryption: BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Deploy website assets to the S3 bucket
    new BucketDeployment(this, "/common-ui-components-website-deployment", {
      sources: [Source.asset(path)],
      destinationBucket: hostingBucket,
    });

    // Create an Origin Access Control (OAC) to securely allow CloudFront to access the S3 bucket
    const oac = new CfnOriginAccessControl(this, "/common-ui-components-oac", {
      originAccessControlConfig: {
        name: "/common-ui-components-oac",
        originAccessControlOriginType: "s3",
        signingBehavior: "always",
        signingProtocol: "sigv4",
      },
    });

    // Create an S3 bucket for CloudFront access logging
    const distributionLoggingPrefix = "distribution-access-logs/";
    const distributionLoggingBucket = new Bucket(
      this,
      "/common-ui-components-distribution-logging-bucket",
      {
        objectOwnership: ObjectOwnership.OBJECT_WRITER,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
        blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
        publicReadAccess: false,
        lifecycleRules: [
          {
            prefix: distributionLoggingPrefix,
            abortIncompleteMultipartUploadAfter: cdk.Duration.days(30),
            expiration: cdk.Duration.days(30),
          },
        ],
      }
    );

    // Retrieve domain configurations from the websiteConfiguration
    const domainConfigs = websiteConfiguration.domains;

    domainConfigs.forEach((domainConfig, index) => {

      // Create CloudFront distributions for each subdomain
      const domainsToHandle = [...domainConfig.subdomains.map(sub => `${sub}.${domainConfig.domainName}`)];
      domainsToHandle.forEach((fullDomain, subIndex) => {

        // Use the certificateArnMap to fetch the certificate ARN
        const certificateArn = props.certificateArnMap.get(fullDomain);

        if (!certificateArn) {
          throw new Error(`Certificate ARN not found for domain: ${fullDomain}`);
        }

        // Create CloudFront distribution
        const cloudFrontDistribution = new CloudFrontWebDistribution(
          this,
          `/common-ui-components-distribution-${index}-${subIndex}`,
          {
            originConfigs: [
              {
                s3OriginSource: {
                  s3BucketSource: hostingBucket,
                },
                behaviors: [
                  {
                    isDefaultBehavior: true,
                    allowedMethods: CloudFrontAllowedMethods.GET_HEAD,
                    compress: true,
                    cachedMethods: CloudFrontAllowedCachedMethods.GET_HEAD,
                    viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
                    minTtl: cdk.Duration.seconds(0),
                    maxTtl: cdk.Duration.seconds(86400),
                    defaultTtl: cdk.Duration.seconds(3600),
                  },
                ],
              },
            ],
            viewerCertificate: {
              aliases: [fullDomain],
              props: {
                acmCertificateArn: certificateArn, // Use the certificateArn from the map
                sslSupportMethod: "sni-only",
                minimumProtocolVersion: "TLSv1.2_2021",
              },
            },
            loggingConfig: {
              bucket: distributionLoggingBucket,
              includeCookies: false,
            },
            defaultRootObject: "index.html"
          }
        );

        // Work around for OAC to add property override to the CloudFront distribution
        const cfnDistribution = cloudFrontDistribution.node
          .defaultChild as CfnDistribution;

        cfnDistribution.addPropertyOverride(
          "DistributionConfig.Origins.0.OriginAccessControlId",
          oac.getAtt("Id")
        );

        // Create CloudFront target for Route 53
        const cdfTarget = new CloudFrontTarget(cloudFrontDistribution);

        // Lookup the hosted zone for the domain and create unique IDs for each
        const hostedZone = HostedZone.fromLookup(this, `HostedZone-${domainConfig.domainName}-${subIndex}`, {
          domainName: fullDomain,
        });

        // Create DNS records for the domain and subdomains
        new ARecord(this, `PublicARecord-${index}-${subIndex}`, {
          recordName: fullDomain,
          zone: hostedZone,
          target: RecordTarget.fromAlias(cdfTarget),
        });

        new AaaaRecord(this, `PublicAAARecord-${index}-${subIndex}`, {
          recordName: fullDomain,
          zone: hostedZone,
          target: RecordTarget.fromAlias(cdfTarget),
        });

        // Add a policy to the S3 bucket to allow CloudFront to access it
        hostingBucket.addToResourcePolicy(
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ["s3:GetObject"],
            principals: [new ServicePrincipal("cloudfront.amazonaws.com")],
            resources: [`${hostingBucket.bucketArn}/*`],
            conditions: {
              StringEquals: {
                "AWS:SourceArn": `arn:aws:cloudfront::${props?.env?.account}:distribution/${cloudFrontDistribution.distributionId}`,
              },
            },
          })
        );
      });
    });
  }
}
