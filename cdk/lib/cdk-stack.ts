import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import { WebSiteStack } from './website-stack';
import { CertificateStack } from './acm-certificate-stack';
import { HostedZoneStack } from './hosted-zone-stack';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class CdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

  
    // Deploy Hosted Zone Stack with cross-region references
    const hostedZoneStack = new HostedZoneStack(scope, 'WebComHostedZoneStack', {
      ...props,
      crossRegionReferences: true
    });

    // Deploy ACM Certificate Stack
    const certificateStack = new CertificateStack(scope, 'WebComCertificateStack', {
      ...props,
      env: {
        account: process.env.CDK_DEFAULT_ACCOUNT,
        region: 'us-east-1', // needed for cloudfront
      },
      hostedZones: [...hostedZoneStack.subdomainHostedZones], // Only issue certficates for subdomains. Certificates are by default issued for root domain
      crossRegionReferences: true
    });

    // Deploy Thuis Glam Website, passing the certificateArnMap
    new WebSiteStack(scope, "WebComWebsiteStack", {
      ...props,
      certificateArnMap: certificateStack.certificateArnMap,
      crossRegionReferences: true
    });
  }
}
