
<div class="post">
	<h1>Typescript Interfaces Wildcard</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;Some times you want to interface something but you dont know what the property name is. It could be a randomly generated ID or string in an Object.&lt;br&gt;
For the most part you&#x27;ll want something like this&lt;br&gt;
&lt;code&gt;[name: string]: String;&lt;/code&gt;&lt;br&gt;
That basically tells TS that any number or strings with any value should have a value that is types to a String. You could even make your own type or another interface and type the wildcard to those.&lt;/p&gt;
&lt;h3 id&#x3D;&quot;mixingknownunknownproperties&quot;&gt;Mixing known &amp;amp; Unknown properties&lt;/h3&gt;
&lt;p&gt;This is where things get tricky. Say you have an Object like this&lt;br&gt;
&lt;code&gt;blocks &#x3D; { 1648: &amp;quot;abc&amp;quot;, 19674: &amp;quot;dfg&amp;quot;, 09573: &amp;quot;jyt&amp;quot;, order:[&amp;quot;1648&amp;quot;, &amp;quot;09573&amp;quot;, &amp;quot;19674&amp;quot;] }&lt;/code&gt;&lt;br&gt;
Since the random properties are numbers I&#x27;ve found that to interface this you simply need this:&lt;br&gt;
&lt;code&gt;[name: Number]: String;&lt;/code&gt; &lt;code&gt;blocks: Array&amp;lt;String&amp;gt;&lt;/code&gt;&lt;br&gt;
But what if&lt;/p&gt;
&lt;/div&gt;
	</div>
</div>

