
<div class="post">
	<h1>AWS Lambda</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;h3 id&#x3D;&quot;lambdacharacteristics&quot;&gt;Lambda Characteristics&lt;/h3&gt;
&lt;ul&gt;
&lt;li&gt;Event Driven&lt;/li&gt;
&lt;li&gt;Max runtime length of 15 minutes&lt;/li&gt;
&lt;li&gt;ephemeral storage of &amp;lt; 512mb&lt;/li&gt;
&lt;li&gt;limit of 1000 concurrent lambda functions&lt;/li&gt;
&lt;/ul&gt;
&lt;p&gt;You upload your dependencies and function information to AWS via a zip file which is known as a &lt;em&gt;function package&lt;/em&gt;&lt;/p&gt;
&lt;h3 id&#x3D;&quot;lambdaanatomy101&quot;&gt;Lambda Anatomy 101&lt;/h3&gt;
&lt;pre&gt;&lt;code&gt;exports.handler &#x3D; function (event, context, callback) {}
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;&lt;strong&gt;event&lt;/strong&gt;: contains information about the action that triggered the lambda.&lt;br&gt;
&lt;strong&gt;context&lt;/strong&gt;: methods and properties that provide info about the execution environment.&lt;br&gt;
&lt;strong&gt;callback&lt;/strong&gt;: fires after the body so you can call other Lambda stuff.&lt;/p&gt;
&lt;h3 id&#x3D;&quot;lambdalearningexcerciselambdacanary&quot;&gt;Lambda Learning Excercise | Lambda Canary&lt;/h3&gt;
&lt;p&gt;Test if a website is up and report on that&lt;/p&gt;
&lt;ul&gt;
&lt;li&gt;Run a function X amount of time ( AWS Cron type of thing )&lt;/li&gt;
&lt;li&gt;Test a the website&lt;/li&gt;
&lt;li&gt;Log the results: Cloudwatch&lt;/li&gt;
&lt;/ul&gt;
&lt;p&gt;Quick start to make a&lt;br&gt;
aws -&amp;gt; lambda -&amp;gt; create function -&amp;gt; blueprint -&amp;gt; canary function -&amp;gt;&lt;/p&gt;
&lt;h3 id&#x3D;&quot;dynamodbserverless&quot;&gt;DynamoDb &amp;amp; Serverless&lt;/h3&gt;
&lt;p&gt;There are 3 ways to get your lambda functions into AWS. You can:&lt;/p&gt;
&lt;ol&gt;
&lt;li&gt;Generate the function inline with Lambda and edit it there&lt;/li&gt;
&lt;li&gt;Upload a zip file: Good option if you want to use npm modules or other external deps. Keep in mind the size limitations of lambdas as well.&lt;/li&gt;
&lt;li&gt;Upload it from S3&lt;/li&gt;
&lt;/ol&gt;
&lt;/div&gt;
	</div>
</div>

