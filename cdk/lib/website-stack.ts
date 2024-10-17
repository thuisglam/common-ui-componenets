import * as cdk from "aws-cdk-lib";
import {
  AllowedMethods,
  CachePolicy,
  Distribution,
  ViewerProtocolPolicy,
  OriginAccessIdentity,
  OriginRequestPolicy,
  ResponseHeadersPolicy,
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
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";

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
      cors: [
        {
          allowedMethods: [cdk.aws_s3.HttpMethods.HEAD, cdk.aws_s3.HttpMethods.GET],
          allowedOrigins: [
            "https://thuisglam.nl",
            "https://thuisglam.com",
            "https://pro.thuisglam.nl",
            "https://pro.thuisglam.com",
          ],
          allowedHeaders: ["*"],
          exposedHeaders: [
            "access-control-allow-credentials",
            "access-control-allow-methods",
            "access-control-allow-origin"
          ],
        },
      ],
    });

    // Deploy website assets to the S3 bucket
    new BucketDeployment(this, "/common-ui-components-website-deployment", {
      sources: [Source.asset(path)],
      destinationBucket: hostingBucket,
    });

    // Create an Origin Access Identity (OAI) to securely allow CloudFront to access the S3 bucket
    const oac = new OriginAccessIdentity(this, "CommonUIComponentsOAI", {
      comment: "OAI for Common UI Components Website",
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

        // Create the certificate object from ARN
        const certificate = Certificate.fromCertificateArn(
          this,
          `Certificate${index}${subIndex}`,
          certificateArn
        );

        // Create CloudFront distribution
        const cloudFrontDistribution = new Distribution(this, `/common-ui-components-distribution-${index}-${subIndex}`, {
          defaultBehavior: {
            origin: new S3Origin(hostingBucket, {
              originAccessIdentity: oac, // Set the OAI for S3 access
            }),
            viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
            allowedMethods: AllowedMethods.ALLOW_ALL,
            compress: true,
            cachePolicy: CachePolicy.CACHING_OPTIMIZED,
            originRequestPolicy: OriginRequestPolicy.CORS_S3_ORIGIN,
            responseHeadersPolicy: ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS
          },
          domainNames: [fullDomain],
          certificate: certificate, // Use the certificate object
          defaultRootObject: "index.html",
          logBucket: distributionLoggingBucket
        });

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
