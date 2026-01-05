
<div class="post">
	<h1>MongoDB 201: setup troubleshooting and Query tips</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;blockquote&gt;
&lt;p&gt;** &lt;em&gt;Post In Development&lt;/em&gt; **&lt;/p&gt;
&lt;/blockquote&gt;
&lt;h2 id&#x3D;&quot;installationgotchas&quot;&gt;Installation Gotchas&lt;/h2&gt;
&lt;p&gt;When I first installed Mongo it was for development on my Mac. During the bootup I got serveral small hurdles I had to figure out.&lt;/p&gt;
&lt;p&gt;The first one was Mongod wouldn&#x27;t start. That issue was just because I had forgot to make the &lt;strong&gt;/data/db&lt;/strong&gt; directory that mongo needs to be able to write it&#x27;s data to. If you do this just cd to your root and do a&lt;br&gt;
&lt;code&gt;sudo mkdir -p /data/db&lt;/code&gt; and make sure it&#x27;s read and writeable by mongo. Since im on dev I just gave it 777 but you may not want to do that.&lt;/p&gt;
&lt;p&gt;The second one is &lt;strong&gt;soft rlimits too low. Number of files is 256, should be at least 100&lt;/strong&gt; To solve this one at the command prompt just type: &lt;code&gt;ulimit -n 2048&lt;/code&gt; before you start the mongod server.&lt;/p&gt;
&lt;p&gt;Last one I kept seeing was &lt;strong&gt;--rest is specified without --httpinterface&lt;/strong&gt;. Funny that I was seeing this because I had actually aliased the &lt;code&gt;mongod&lt;/code&gt; command to &lt;code&gt;mongod --rest&lt;/code&gt; in my bash profile and forgot about it last time I was playing with mongo so I created this warning myself. Now this is just a warning and it still works fine, but I don&#x27;t like to have any weirdness going in my environments so I investigated and i&#x27;m glad I did. If not I wouldn&#x27;t have figured out you can view mongo collections in the browser visually :). To do so just point your browser to:&lt;br&gt;
&lt;code&gt;http://localhost:28017/&amp;lt;dbname&amp;gt;/&amp;lt;collection_name&amp;gt;/&lt;/code&gt;&lt;br&gt;
The better way to configure this is with the &lt;strong&gt;mongodb.conf&lt;/strong&gt; file. This bit can bit tricky.&lt;br&gt;
&lt;a href&#x3D;&quot;http://docs.mongodb.org/ecosystem/tools/http-interfaces/&quot;&gt;HTTP / Rest interface&lt;/a&gt;.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;whatisadocument&quot;&gt;What is a document:&lt;/h2&gt;
&lt;p&gt;A document is pretty much the same as a JSON object.&lt;br&gt;
This is an empty document &lt;code&gt;{ }&lt;/code&gt;. Mongo calls this type of JSON a &lt;strong&gt;BSON&lt;/strong&gt; document. Mongo has coined the term BSON to reference the way mongo stores its data. They say to think of  as an amalgamation of &lt;strong&gt;B&lt;/strong&gt;inary and J&lt;strong&gt;SON&lt;/strong&gt;. Essentially you can think of BSON as JSON with some super powers. It has some extra abilities like some date stuff and such that normal JSON doesnt have. Enough acronyms though. Let&#x27;s move on.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;queryingdocumentsinmongo&quot;&gt;Querying Documents in Mongo&lt;/h2&gt;
&lt;p&gt;In mongo you make a query like so:&lt;br&gt;
&lt;code&gt;db.collectionname.find(&amp;lt;criteria&amp;gt;, &amp;lt;projection&amp;gt;)&lt;/code&gt; Where criteria is a query document and &lt;em&gt;projection&lt;/em&gt; is a filter of only what you want to get back. If you pass a empty query document or none at all then mongo effectively does a &lt;strong&gt;sql * like&lt;/strong&gt; query returning everything. So &lt;code&gt;db.accounts.find({})&lt;/code&gt; in our case would return everything.&lt;/p&gt;
&lt;p&gt;So if we were to look me up by my twitter handle the query would go something like:&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-mongo&quot;&gt;db.accounts.find({ twitter_username: &amp;quot;peb7268&amp;quot; })
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;and if we were to add a projection to filter the results and only show the twitter username, it would look something like this:&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-mongo&quot;&gt;db.accounts.find({ twitter_username: &amp;quot;peb7268&amp;quot; }, { twitter_username: 1, _id: 0 })
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;The one signifies inclusion and the 0 exclusion. The reason we had to exclude _id is because it is automatically included on all query result sets.&lt;/p&gt;
&lt;p&gt;If you think projections is a weird name for filters you aren&#x27;t alone. I thought the same thing.&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;Think of projections as that new age technique of visualizing the reality you want. You think, im going to be successful, buff, and have all the chicks, and its supposed to manifest like that. Thats how a Mongo filter works. You project what kind of document you want and poof. It appears like that.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;p&gt;You can read more on &lt;a href&#x3D;&quot;http://learnmongodbthehardway.com/ex14.html&quot;&gt;advanced MongoDB queries here&lt;/a&gt; and &lt;a href&#x3D;&quot;http://docs.mongodb.org/manual/tutorial/query-documents/&quot;&gt;here&lt;/a&gt;.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;limitingyourresultsetusingprojections&quot;&gt;Limiting your result set using Projections.&lt;/h2&gt;
&lt;p&gt;In mongo you can limit the result set like this:&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-mongo&quot;&gt;//db.collection.find(&amp;lt;criteria&amp;gt;, &amp;lt;projection&amp;gt;)
db.accounts.find({ name: { first: &amp;quot;Paul&amp;quot;, last: &amp;quot;Barrick&amp;quot;  }}, {name: 1, _id: 0 })
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;So in the query above, name was the &lt;strong&gt;criteria&lt;/strong&gt; and name and _id were &lt;strong&gt;projection&lt;/strong&gt; fields. Mongo docs say:&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;A &lt;strong&gt;Projection&lt;/strong&gt; is a document with a list of fields for inclusion and exclusion.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;p&gt;Projections can be as simple as above where &lt;em&gt;1&lt;/em&gt; indicates a field to include and &lt;em&gt;0&lt;/em&gt; indicates a field to exclude or more complicated in which case &lt;em&gt;projection operators&lt;/em&gt; are used.&lt;/p&gt;
&lt;p&gt;Let&#x27;s look at a more complex example that uses a query operator and a projection to return a filtered result set:&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-mongo&quot;&gt; db.accounts.find({ twitter_username: { $in: [&#x27;peb7268&#x27;, &#x27;abcUser&#x27;, &#x27;TomJones&#x27;] } }, { twitter_username: 1, name: 1, _id: 0 })
 
{ &amp;quot;twitter_username&amp;quot; : &amp;quot;peb7268&amp;quot;, &amp;quot;name&amp;quot; : { &amp;quot;first&amp;quot; : &amp;quot;Paul&amp;quot;, &amp;quot;last&amp;quot; : &amp;quot;Barrick&amp;quot; } }

&lt;/code&gt;&lt;/pre&gt;
&lt;h2 id&#x3D;&quot;queryingsubdocumentsprojectingontothem&quot;&gt;Querying Subdocuments &amp;amp; Projecting onto them.&lt;/h2&gt;
&lt;p&gt;I gotta admit. This one stumpped me for a bit. Let&#x27;s imagine we have the following document:&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-mongo&quot;&gt;{ &amp;quot;_id&amp;quot; : ObjectId(&amp;quot;5353007df893a6484c000001&amp;quot;), &amp;quot;email&amp;quot; : &amp;quot;peb7268@superawesomeemail.com&amp;quot;, &amp;quot;password&amp;quot; : &amp;quot;13d249f2cb4127b40cfa757866850278793f814ded3c587fe5889e889a7a9f6c&amp;quot;, &amp;quot;name&amp;quot; : { &amp;quot;first&amp;quot; : &amp;quot;Paul&amp;quot;, &amp;quot;last&amp;quot; : &amp;quot;Barrick&amp;quot; } }
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;The subdocument part would be name. Its a document within a document. One might think that you could query with just the first name to find this record like so:&lt;/p&gt;
&lt;p&gt;&lt;code&gt;db.accounts.find({ &#x27;name&#x27;: {&#x27;first&#x27;: &amp;quot;Paul&amp;quot; } })&lt;/code&gt;&lt;br&gt;
or even this perhaps:&lt;br&gt;
&lt;code&gt;db.accounts.find({ &#x27;name&#x27;: {&#x27;first&#x27;: { &amp;quot;Paul&amp;quot; } } })&lt;/code&gt;&lt;/p&gt;
&lt;p&gt;But alas, none of those work. You may query a subdocument one of two ways:&lt;/p&gt;
&lt;ul&gt;
&lt;li&gt;specify the whole document as the query&lt;/li&gt;
&lt;li&gt;use dot notation.&lt;/li&gt;
&lt;/ul&gt;
&lt;p&gt;The first way is like this:&lt;br&gt;
&lt;code&gt;db.accounts.find({ &#x27;name&#x27;: { first: &amp;quot;Paul&amp;quot;, last: &amp;quot;Barrick&amp;quot; } })&lt;/code&gt;&lt;br&gt;
and the second (&lt;em&gt;and my preferable way&lt;/em&gt; ) is like this:&lt;br&gt;
&lt;code&gt;db.accounts.find({ &#x27;name.first&#x27;: &amp;quot;Paul&amp;quot; })&lt;/code&gt;&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;When doing an exact match query on a subdocument ( method 1 ) Your query document must match EXACTLY. The fields even have to be in the same order.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;/div&gt;
	</div>
</div>

