import * as cdk from 'aws-cdk-lib';
import { Certificate, CertificateValidation } from 'aws-cdk-lib/aws-certificatemanager';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';
import { acmCertificateConfiguration } from '../config/acmCertficateConfiguration';


interface CertificateStackProps extends cdk.StackProps {
    hostedZones: { zone: HostedZone, domainName: string }[]; // Hosted zones for which certificates will be generated
}

export class CertificateStack extends cdk.Stack {
    // Public map to store domain names and their corresponding certificate ARNs
    public readonly certificateArnMap: Map<string, string> = new Map();

    constructor(scope: Construct, id: string, props: CertificateStackProps) {
        super(scope, id, props);

        // Loop through each hosted zone passed to the stack and create a new certificate
        props.hostedZones.forEach((hostedZoneInfo, index) => {
            const certificate = new Certificate(this, `Certificate-${index}`, {
                domainName: hostedZoneInfo.domainName,
                validation: CertificateValidation.fromDns(hostedZoneInfo.zone),
            });

            // Store the dynamically created certificate ARN in the map
            this.certificateArnMap.set(hostedZoneInfo.domainName, certificate.certificateArn);
        });

        // Add pre-existing certificates from the configuration file to the map
        acmCertificateConfiguration.domains.forEach(domainInfo => {
            this.certificateArnMap.set(domainInfo.domainName, domainInfo.certificateArn);
        });
    }
}
