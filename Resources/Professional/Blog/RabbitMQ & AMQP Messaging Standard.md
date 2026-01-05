
<div class="post">
	<h1>RabbitMQ &amp; AMQP Messaging Standard</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;h1 id&#x3D;&quot;rabbitmq&quot;&gt;RabbitMQ&lt;/h1&gt;
&lt;p&gt;Is a cross platform messaging queue.&lt;br&gt;
You can think of it as Pub/Sub on a system level as opposed to appication level.&lt;/p&gt;
&lt;h4 id&#x3D;&quot;terminology&quot;&gt;Terminology&lt;/h4&gt;
&lt;ul&gt;
&lt;li&gt;Publisher: client that sends messages to a broker.&lt;/li&gt;
&lt;li&gt;Message Broker: Recieves messages from Publisher (client) &amp;amp; routes them to an exchange&lt;/li&gt;
&lt;li&gt;Exchange: Recieves messages from broker and routes them to a queue via bindings&lt;/li&gt;
&lt;li&gt;Queue: collection of messages used to communicate between systems&lt;/li&gt;
&lt;li&gt;Consumer: Subscribes to the queue and pulls messages&lt;/li&gt;
&lt;/ul&gt;
&lt;h2 id&#x3D;&quot;exchangesthemiddleman&quot;&gt;Exchanges - The middleman&lt;/h2&gt;
&lt;p&gt;AMQP entities that recieve messages sent to them via a message broker.&lt;/p&gt;
&lt;p&gt;The purpose of an exchange is to act as a middleman between the Publisher and a queue. They route these messages to queues based on bindings. These bindings have different types depending on which type of exchange is used.&lt;/p&gt;
&lt;h4 id&#x3D;&quot;exchangetypes&quot;&gt;Exchange Types&lt;/h4&gt;
&lt;ul&gt;
&lt;li&gt;&lt;strong&gt;Direct Exchange&lt;/strong&gt;: Is where the routing key matches the queue key. Ideal if you want to publish messages onto just one queue&lt;br&gt;
&lt;img src&#x3D;&quot;https://lostechies.com/content/derekgreer/uploads/2012/03/DirectExchange1.png&quot; alt&#x3D;&quot;&amp;quot;direct exchange&amp;quot;&quot;&gt;&lt;/li&gt;
&lt;li&gt;&lt;strong&gt;Fanout Exchange&lt;/strong&gt;: Routes messages to all queues bound to it. Think of this as indiscriminate broadcast.&lt;br&gt;
&lt;img src&#x3D;&quot;https://lostechies.com/content/derekgreer/uploads/2012/03/FanoutExchange_thumb2.png&quot; alt&#x3D;&quot;&amp;quot;fanout exchange&amp;quot;&quot;&gt;&lt;/li&gt;
&lt;li&gt;&lt;strong&gt;Topic Exchange&lt;/strong&gt;: Routes messages to queues who with a blob style matching on route keys. So in esscence, routing messages to groups of queues.You can think of this as wildcard matching.&lt;br&gt;
&lt;img src&#x3D;&quot;https://lostechies.com/content/derekgreer/uploads/2012/03/TopicExchange2.png&quot; alt&#x3D;&quot;&amp;quot;topic exchange&amp;quot;&quot;&gt;&lt;/li&gt;
&lt;li&gt;&lt;strong&gt;Header Exchange&lt;/strong&gt;: One or more of the headers are used to compose a key which matches the queue.&lt;br&gt;
&lt;img src&#x3D;&quot;https://lostechies.com/content/derekgreer/uploads/2012/03/HeadersExchange_thumb2.png&quot; alt&#x3D;&quot;&amp;quot;header exchange&amp;quot;&quot;&gt;&lt;/li&gt;
&lt;/ul&gt;
&lt;p&gt;Exchanges have a common interface that they adhere to. This consists of:&lt;/p&gt;
&lt;ul&gt;
&lt;li&gt;Name: The name of the exchange&lt;/li&gt;
&lt;li&gt;Durability: Persisting the message to disk?&lt;/li&gt;
&lt;li&gt;Auto-delete: Delete the message when not needed&lt;/li&gt;
&lt;li&gt;Arguments: Message broker dependent&lt;/li&gt;
&lt;/ul&gt;
&lt;h2 id&#x3D;&quot;routingkeys&quot;&gt;Routing Keys&lt;/h2&gt;
&lt;p&gt;Message brokers contain a default exchange which is blank routing key of &lt;code&gt;&amp;quot; &amp;quot;&lt;/code&gt; means go to all queues. Every queue that is created is automatically bound to an exchange of the same name by the message broker&lt;br&gt;
Queue name:&lt;/p&gt;
&lt;h2 id&#x3D;&quot;queues&quot;&gt;Queues&lt;/h2&gt;
&lt;p&gt;Messages are placed on a queue in a fifo method. Messages can be removed from a queue either when the message is sent to the consumer, or once a consumer sends and acknoledgement message back to the broker.&lt;/p&gt;
&lt;/div&gt;
	</div>
</div>

