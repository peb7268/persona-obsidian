
<div class="post">
	<h1>Express: Response Objects</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;In the first article in this series we looked at what a typical express app looks like. To recap, here is a super simple express app:&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-JavaScript&quot;&gt;var express &#x3D; require(&#x27;express&#x27;);
var app &#x3D; express();

app.get(&#x27;/&#x27;, function(req, res){
  res.send(&#x27;hello world&#x27;);
});

app.listen(3000);
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;The part we are going to focus on in this article is the &lt;strong&gt;response object&lt;/strong&gt;. It is the part that is denoted by res or resp in most express apps. It controls what is sent back to the client ( Aka the browser ).&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;The response object can modify header information, send back html, plain text, even files.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;p&gt;Let&#x27;s look at some things you can do with the response object.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;redirecttoanotherurl&quot;&gt;Redirect to another URL&lt;/h2&gt;
&lt;p&gt;This can accept multiple types of destinations to redirect to, and takes an optional HTTP status code. If no status code is given it defaults to 302.&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-JavaScript&quot;&gt;res.redirect(&#x27;users/1&#x27;);
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;The destinations that this accepts are:&lt;/p&gt;
&lt;ul&gt;
&lt;li&gt;a relative type: &#x27;/users/1&#x27;&lt;/li&gt;
&lt;li&gt;a url: &lt;a href&#x3D;&quot;http://somesite.com&quot;&gt;http://somesite.com&lt;/a&gt;&lt;/li&gt;
&lt;li&gt;url with a status: 301, &lt;a href&#x3D;&quot;http://somesite.com&quot;&gt;http://somesite.com&lt;/a&gt;&lt;/li&gt;
&lt;li&gt;relative file notation: &#x27;..&#x27; would take the users/1 path to just &#x27;users&#x27;.&lt;/li&gt;
&lt;li&gt;and to the referrer - with the &#x27;back&#x27; keyword: &lt;strong&gt;res.redirect(&#x27;back&#x27;)&lt;/strong&gt;&lt;/li&gt;
&lt;/ul&gt;
&lt;/div&gt;
	</div>
</div>

