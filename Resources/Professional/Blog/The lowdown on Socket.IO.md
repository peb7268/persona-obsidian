
<div class="post">
	<h1>The lowdown on Socket.IO</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;Socket.IO is a Bi-Directional multicast framework. In english:&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;Socket.IO is a tool to enable 2-way continuous communication between a server and X number of clients.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;p&gt;It works on the pubsub model.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;howtoconnect&quot;&gt;How to connect&lt;/h2&gt;
&lt;p&gt;In order to start using socket.io all you have to do is include the framework on your page with  a script tag and in your JS file require it. Then do this:&lt;/p&gt;
&lt;p&gt;&lt;code&gt;var socket &#x3D; io.connect(http://localhost:8080);&lt;/code&gt; will grab a connected socket for you. Think of this as a live telephone connection. Whatever you say in one end of the reciever gets transmitted live to the other end ( Minus latency of course ;) ).&lt;/p&gt;
&lt;h2 id&#x3D;&quot;howdoicommunicatebetweenclientandserver&quot;&gt;How do I communicate between client and server?&lt;/h2&gt;
&lt;p&gt;Socket.io&#x27;s implementation for communication is similar to jQuery&#x27;s event binding. You call &lt;code&gt;socket.on&lt;/code&gt; to listen for aka &lt;em&gt;subscribe to&lt;/em&gt; an event and &lt;code&gt;socket.emit&lt;/code&gt; to &amp;quot;trigger&amp;quot; or &lt;em&gt;publish&lt;/em&gt; and event.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;diffrenttypesofpublishing&quot;&gt;Diffrent types of publishing&lt;/h2&gt;
&lt;p&gt;So you have many types of publishing / notifying a client about communication that&#x27;s ready to take place. Some examples include:&lt;/p&gt;
&lt;ul&gt;
&lt;li&gt;Notifying the client that an event takes place: &lt;code&gt;socket.emit&lt;/code&gt;.&lt;/li&gt;
&lt;li&gt;Notifying everyone except the original sender that there is an event to take place: &lt;code&gt;socket.broadcast.emit&lt;/code&gt;&lt;/li&gt;
&lt;/ul&gt;
&lt;/div&gt;
	</div>
</div>

