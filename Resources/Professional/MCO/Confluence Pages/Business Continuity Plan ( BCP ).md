---
connie-publish: true
connie-page-id: "2062024705"
---

In the software development and DevOps context, BCP may involve strategies like:

1. **Disaster Recovery**: Includes procedures to recover critical IT infrastructure and systems following a disaster. Techniques like data replication, backups, and hosting in geographically distributed data centers are typically used.

2. **Fault Tolerance and Redundancy**: Designing systems to continue to function even when there are certain failures. This can be achieved by creating redundant systems or using cloud services which are inherently designed for high availability.

3. **Risk Management**: Identifying potential risks and defining appropriate solutions or mitigations to avoid them. This can be in terms of both technical (such as system failures) and business risks (such as vendor reliability or cybersecurity threats).

4. **Incident Response**: Having a plan to quickly and efficiently respond to incidents that may cause service disruption. This can involve automated alerting and failover systems, as well as predefined manual procedures.

5. **Continuous Integration/Continuous Deployment (CI/CD)**: Involves automated testing and deployment of software, reducing the risks associated with human error, and allowing for rapid rollback or forward-fixing of code in case of discovered vulnerabilities or failures.



## WIP BCP

TODOS:
* Replicate our backups to another region. Atlas has a new feature called **snapshot distribution**
* **Mongo** backs staging up every 6 hours in us-west-2 ( legacy services for 7 day retention ),  production has same policies but to es-west-1 and a weekly snapshot as well on Saturdays.
* **ES Snapshots** occur on a daily schedule
* Ticket to estimate cost to copy backups to other regions. 
* Ticket to do weekly backup of S3 to another region in a deep freeze state

---

# Disaster Recovery Plan (DRP)

## Objective

The objective of this plan is to establish procedures for recovering our critical IT infrastructure and systems following a disaster. This plan aims to minimize the duration of service outage and ensure continuity of operations in the face of such events.

## Scope

This DRP covers the systems, personnel, and procedures involved in recovering the following critical services:

1. Our main web application.
2. Our customer database.
3. Our internal communication and coordination tools.

## Disaster Definition

A disaster is any event that leads to the unavailability of our primary data center and causes an interruption to our service that cannot be restored by usual day-to-day disaster recovery procedures.

## Recovery Strategy

1. **Data Replication**: All data in our primary data center is replicated in real-time to our secondary data center located in a different geographic region. This includes all data necessary for our application to function, such as user data, application data, and configuration data.

2. **System Redundancy**: Our application runs on multiple servers in a load-balanced configuration. In case of a disaster, the load balancer will automatically redirect traffic to the servers in the secondary data center.

3. **Backup and Restore Procedures**: In addition to real-time replication, we perform daily backups of all data. These backups are stored in a third, geographically separate location. In the event that both the primary and secondary data centers are unavailable, we will restore service from these backups at a cloud service provider.

4. **Automated Failover**: We have automated failover procedures in place. In case our monitoring systems detect a failure of the primary data center, they will automatically switch all services to run from the secondary data center.

## Plan Activation

This plan will be activated in the event of a disaster that causes the primary data center to be unavailable. The decision to activate this plan will be made by the CTO in consultation with the IT manager and the CEO.

## Roles and Responsibilities

The IT manager will be responsible for the execution of this DRP. The IT team will assist in recovery operations, and the customer service team will keep our customers informed about the status of the recovery.

## Testing

This DRP will be tested twice a year. The tests will include both simulated disaster situations and the actual failover and failback of services.

## Plan Review and Maintenance

This DRP will be reviewed and updated annually, or whenever there are significant changes to our IT infrastructure or business requirements. The IT manager will be responsible for ensuring the plan is kept up-to-date.

Remember, the actual BCP and DRP would be much more detailed, and would need to include detailed steps to be followed in the event of a disaster, checklists, contact information, etc. It's also crucial that everyone involved in the plan is properly trained and that the plan is regularly tested and updated.


Sure, here's an example of a Business Continuity Plan (BCP) focusing on Fault Tolerance for a hypothetical software company that provides online services:

### Tolerance Plan

## Objective

The objective of this plan is to design and manage systems in a way that ensures continuous functionality even in the face of individual component or system failures.

## Scope

This plan covers all critical systems required to deliver our services, including but not limited to:

1. Web servers for our online application
2. Database servers
3. Network infrastructure
4. Authentication servers

## Strategy for Fault Tolerance

1. **Redundant Systems**: We will maintain redundant systems for all critical components of our infrastructure. For instance, our online application will be served by a cluster of servers, such that if one server fails, the load can be distributed to the others without disrupting the service.

2. **Load Balancing**: A load balancer will distribute network traffic across multiple servers to optimize system response and ensure no single server is overwhelmed, which could potentially lead to failure.

3. **Database Replication**: We will implement real-time database replication. The master database will be continually synchronized with the replica databases, ensuring that if the master database fails, one of the replicas can immediately take over with no loss of data. Atlas currently does this. It's a cluster of three replicas'. ES is sharded. Each shard is replicated once. 

4. **Automated Failover**: We will implement automated failover procedures. In the event of a failure, the system will automatically switch over to a redundant system with little to no service disruption. **DONT HAVE THIS / Probably dont want this**

5. **Data Backup**: Regular and frequent backups will be taken and stored securely off-site. This ensures that in the event of a failure, we can restore the system to the most recent backup, minimizing data loss.

6. **Heartbeat Monitoring**: All systems will be continually monitored for their 'heartbeat'. If a system fails to send a heartbeat, indicating potential failure or downtime, automatic notifications will be sent to the DevOps team for immediate attention. Cloudwatch and uptime report ( Not hearbeat per-se ) *Container load balancer healthcheck is configured to operate kind of like this with a 300s grace period.* 

## Roles and Responsibilities

The DevOps team will be primarily responsible for the implementation and management of the fault-tolerance strategies. They will work in close collaboration with the software engineering team to ensure the software is designed to function correctly in this fault-tolerant infrastructure.

## Training and Awareness

All members of the DevOps and engineering teams will be provided with training to understand the fault tolerance strategies and their role in maintaining them.

## Testing

The fault tolerance strategies will be tested regularly as part of routine system testing. This may involve purposely causing a system to fail in a controlled environment to ensure the failover processes work correctly.

## Plan Review and Maintenance

This plan will be reviewed and updated at least annually or whenever significant changes are made to the system infrastructure. The DevOps manager is responsible for initiating these reviews and updates.

By following this plan, we aim to minimize system downtime and the impact of any failures on our service and our users.


## Risk Management
TODO


## Incident response
TODO: Link to fairwords delivery process doc