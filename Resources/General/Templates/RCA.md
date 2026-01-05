This is an internal RCA and is not customer facing.   
For the customer incident report refer to - < customer facing RCA >


## Summary

*


  

### Metrics/ Graphs

Key metrics/graphs/tables that highlight the impact of the event. Eg: availability, order drops etc.


## Customer Impact
*1-2 paragraph of customer impact. Exact figures describing impact, duration and blast radius. If data is not available, ensure an action plan to have such data next time.*



## Incident response

How did we respond to the issue?

Did we detect it, or did the customer report it? How can time to detection be improved?



**TODO** We need a better internal alerting mechanism for this sort of slowdown.

  

How could time to mitigation be improved?

Identifying that there was a long running SQL, and that it was a problem took DBA specific access:

TODO ** add better Datadog access to be able to identify long running threads.

DB connections are only visible directly on the server

TODO ** add database connection usage information to Datadog.

  

How could you have cut the time to respond in half?

  

## Post incident analysis

How was the root cause diagnosed?

Long running query was identified by the DBA. The cause is under review.

  

How could we improve the time to diagnosis?

DataDog monitoring of both app and DB tier will open the visibility of such causes.

  

Are there any related backlog items?

???

  

Could we programmatically analyse (code/config or other) for the failure mode?

???

## Timeline

All elements of the timeline leading to the incident, and metrics during and post recovery.

27 Feb ~1.30pm - Long running query [[CI-39714]](https://mycomplianceoffice.atlassian.net/browse/CI-39714) which was trying to address a customer issue

  

27 Feb 2.45 - first internal MCO report of production issues

27 Feb 3pm - Engineering team started to review system.

27 Feb 3.45pm - Problematic SQL was terminated and database response times recovered.

  
  

## 5 Whys

Start with the why until you get all contributing causes…

  

Why did the system Slow down?

The system slowed down due to a long running sql that slowed down database activities.

  

Why was the SQL run on production?

[[CI-39714]](https://mycomplianceoffice.atlassian.net/browse/CI-39714) was trying to address a customer issue.

  

Why did the SQL have such an impact on the database?

??? SaiVijay Kumar - DBA to detail why this query caused such a problem and how to address it in the future to prevent it from bringing the whole system down.

  

Why did the application respond so poorly to the database slowdown?

As a result of the DB behavior, normal queries were taking much longer than expected to complete. As new requests were made by customers, additional connections to the database were required until all connections were exhausted. With database connections exhausted, even basic queries to the application were blocked.

  

Why are all DB connections treated equally?

In order to simplify application configuration, all database connections are managed through a single pool. Alternative strategies include having a core pool of connections for critical (typically faster responding) queries like login means the application may degrade more gracefully for customers. ??? Vijay Kumar - Architecture George O'Shea has anything like this been considered in the past?

A separate database connection pool won’t help since the database server was already overwhelmed by that single query. So, every database call from the app was slow as a result.

Why was this SQL run outside of a maintenance window, and/or CAB process?

???? Kenneth Umali to detail if it was SOP, or if it has been done before, etc..

This query was considered a SOP when executed but should it have been.

Why did this behaviour not show up in testing?

???? Kenneth Umali was this tested in non-prod?

Why was this data change required? Is it the result of a client being unable to self-service or because something did not work as expected in the application?

??? Kenneth Umali

  

Why does the login failure, or any failure in the application present such a poor customer experience?

??? Chris Duffin - DevOps Philip Thompson - IT not sure where this goes, but it appears that apache has a mis configured ErrorDocument to deal with a 502? TODO *** fix apache configuration such that a more graceful message is presented to user.

![[Resources/General/Assets/Images/b89d6c55352a01ebda14e2da953ceb96_MD5.png]]

  
  

## Actions

### Immediate (next 90 days)

|JIRA ID|Title|Priority|Due Date|
|---|---|---|---|
|||||
|||||

### Longer term Programmes

Related work items requiring larger investment or design decisions.

Track TechOps tickets with Data Change Subcategory. All Data Change tickets should be reviewed to determine why we are making them, whether it is a lack of functionality or functionality not working as expected. If due to lack of functionality, add FS to create that functionality to empower the client or add the capability to an Admin tool that uses standardized functionality to perform that task safely with tracking.