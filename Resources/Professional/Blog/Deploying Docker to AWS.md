
<div class="post">
	<h1>Deploying Docker to AWS</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;** POST IN DEVELOPMENT **&lt;/p&gt;
&lt;p&gt;So to say that deploying docker images to AWS is hard would be an understatement in my opinion. There is so much Jargon and so many configurations that it can be seriously overwhelming. There are roughly six steps in deploying docker containers to AWS. First ill outline those and then we will define a glossary for the Jargon.&lt;/p&gt;
&lt;h3 id&#x3D;&quot;thesixstepstodeploydockertoaws&quot;&gt;The Six Steps to Deploy Docker to AWS&lt;/h3&gt;
&lt;ol&gt;
&lt;li&gt;Create an ECS Cluster&lt;/li&gt;
&lt;li&gt;Create an ELB&lt;/li&gt;
&lt;li&gt;Create IAM Roles&lt;/li&gt;
&lt;li&gt;Create an Auto Scaling Group&lt;/li&gt;
&lt;li&gt;Run Docker containers in your ECS Cluster&lt;/li&gt;
&lt;li&gt;Update Docker containers in your ECS Cluster&lt;/li&gt;
&lt;/ol&gt;
&lt;h2 id&#x3D;&quot;glossary&quot;&gt;Glossary&lt;/h2&gt;
&lt;ul&gt;
&lt;li&gt;&lt;strong&gt;ECS&lt;/strong&gt; stands for Elastic Container Service: All it means is it is a service that runs Docker containers.&lt;/li&gt;
&lt;li&gt;&lt;strong&gt;ECR&lt;/strong&gt; is the Elasitc Container Registry. Basically, it&#x27;s AWS&#x27;s version of Dockerhub.&lt;/li&gt;
&lt;li&gt;&lt;strong&gt;ECS Cluster&lt;/strong&gt; Wikipedia says it nicely, A computer cluster is a set of loosely or tightly connected computers that work together so that, in many respects, they can be viewed as a single system.&lt;/li&gt;
&lt;li&gt;&lt;strong&gt;ELB&lt;/strong&gt; stands for Elastic Load Balancer. It is responsible for taking all of the incoming requests and routing them to each piece of the cluster where they should go.&lt;/li&gt;
&lt;li&gt;&lt;strong&gt;IAM Roles&lt;/strong&gt; IAM stands for Identity Access Management. It says who can do what. If you have ever used wordpress for instance, there are authors, subscribers, users, admins ect.. Each role has different capabilities. Another term for this is an ACL, or access control list.&lt;/li&gt;
&lt;li&gt;&lt;strong&gt;Auto Scaling Group&lt;/strong&gt; is  like autopiolot for making sure your app stays up. If one piece of it goes down, auto scaling knows to bring it back up. In other words, autoscaling groups controls the number of containers running and when to start them and do other managerial tasks.&lt;/li&gt;
&lt;li&gt;&lt;strong&gt;Repository&lt;/strong&gt; you can think of this as a virtal folder that holds all of the images you push to Amazon&#x27;s registry ( ECR )&lt;/li&gt;
&lt;li&gt;&lt;strong&gt;AMI&lt;/strong&gt; is just a fancy way of saying an Amazon VM. It stands for Amazon Machine Image.&lt;/li&gt;
&lt;/ul&gt;
&lt;h2 id&#x3D;&quot;howdoesthegeneralworkflowgo&quot;&gt;How does the general work flow go?&lt;/h2&gt;
&lt;ol&gt;
&lt;li&gt;First, you setup a cluster to hold all of your container instances.&lt;/li&gt;
&lt;li&gt;You create a load balancer to intercept requests and route them to where they need to go.&lt;/li&gt;
&lt;li&gt;You set permissions with IAM roles.&lt;/li&gt;
&lt;li&gt;Next you create an auto scaling group and define your rules. When it should start new instances, what types of instances it should start, ect.&lt;/li&gt;
&lt;li&gt;Lastly start up your instances.&lt;/li&gt;
&lt;/ol&gt;
&lt;/div&gt;
	</div>
</div>

