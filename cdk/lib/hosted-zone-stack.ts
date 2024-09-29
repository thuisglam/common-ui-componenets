import * as cdk from 'aws-cdk-lib';
import { HostedZone } from 'aws-cdk-lib/aws-route53';
import { Construct } from 'constructs';
import { hostedZoneConfiguration } from '../config/hostedZoneConfiguration';

export class HostedZoneStack extends cdk.Stack {

    public readonly subdomainHostedZones: { zone: HostedZone, domainName: string }[] = [];

    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        hostedZoneConfiguration.domains.forEach((domainConfig, index) => {

            // Create Hosted Zones for each subdomain
            domainConfig.subdomains.forEach((subdomain, subdomainIndex) => {
                const subdomainFullName = `${subdomain}.${domainConfig.domainName}`;

                // Create a Hosted Zone for the subdomain
                const subdomainHostedZone = new HostedZone(this, `SubdomainHostedZone${index}-${subdomainIndex}`, {
                    zoneName: subdomainFullName,
                });

                // Add the subdomain hosted zone and domain name to the array
                this.subdomainHostedZones.push({ zone: subdomainHostedZone, domainName: subdomainFullName });

                // Output the Hosted Zone ID for the subdomain
                new cdk.CfnOutput(this, `SubdomainHostedZoneIdOutput-${index}-${subdomainIndex}`, {
                    value: subdomainHostedZone.hostedZoneId,
                    description: `The Hosted Zone ID for the subdomain: ${subdomainFullName}`,
                    exportName: `HostedZoneId-${subdomainFullName.replace(/\./g, '-')}`, // Export name should be compliant
                });
            });
        });
    }
}
