
<div class="post">
	<h1>Using Jmeter to load test your application</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;&lt;a href&#x3D;&quot;https://www.youtube.com/watch?v&#x3D;M-iAXz8vs48&quot;&gt;https://www.youtube.com/watch?v&#x3D;M-iAXz8vs48&lt;/a&gt;&lt;/p&gt;
&lt;h2 id&#x3D;&quot;whatdoesjmeterdo&quot;&gt;What does Jmeter do?&lt;/h2&gt;
&lt;h2 id&#x3D;&quot;jmetervenacular&quot;&gt;Jmeter venacular&lt;/h2&gt;
&lt;ul&gt;
&lt;li&gt;&lt;strong&gt;Thread Group&lt;/strong&gt;: The group of users that will be hitting the app
&lt;ul&gt;
&lt;li&gt;&lt;em&gt;number of threads&lt;/em&gt;: number of users&lt;/li&gt;
&lt;li&gt;&lt;em&gt;ramp up period&lt;/em&gt;: how much time it takes for all of the users to have hit the app.&lt;/li&gt;
&lt;li&gt;&lt;em&gt;loop count&lt;/em&gt;: how many times you want it to run&lt;/li&gt;
&lt;/ul&gt;
&lt;/li&gt;
&lt;li&gt;&lt;strong&gt;Sample Time / Response Time / Load Time / Elapsed Time&lt;/strong&gt;: Time from which the initial request was started until the request was fully recieved.&lt;/li&gt;
&lt;li&gt;&lt;strong&gt;Latency&lt;/strong&gt;: time to first byte recieved&lt;/li&gt;
&lt;li&gt;&lt;strong&gt;Connect Time&lt;/strong&gt;: time taken to establish a tcp handshake between jMeter and the server.&lt;/li&gt;
&lt;/ul&gt;
&lt;p&gt;To explain ramp up time a little better, if you have 10 users and a ramp of time of 20 seconds, every 2 seconds a user would hit the app.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;addingyourrequest&quot;&gt;Adding your request&lt;/h2&gt;
&lt;p&gt;To add a request, you do the following:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;sampler -&amp;gt; HTTP Request
&lt;/code&gt;&lt;/pre&gt;
&lt;h2 id&#x3D;&quot;verifyingtheresult&quot;&gt;Verifying the result&lt;/h2&gt;
&lt;p&gt;To know if your request was successful or not you use a listener.&lt;br&gt;
To add that go to:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;add -&amp;gt; listeners -&amp;gt; view results in table 
and also
add -&amp;gt; listeners -&amp;gt; view results in tree
&lt;/code&gt;&lt;/pre&gt;
&lt;/div&gt;
	</div>
</div>

