
<div class="post">
	<h1>Mongo DB 101: Down the NoSql rabbit hole.</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;At some point I figure it would be good to move my ghost install off of the SQLite db it comes with and move over to something like mongo. With its&#x27; growing popularity and use accross multiple platforms I figured at some point it would be good to learn mongo.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;howtoinstall&quot;&gt;How to install?&lt;/h2&gt;
&lt;p&gt;Well i&#x27;ll admit, at first pass I decided this was a little tricker than I wanted and decided to be a punk and give up. Since then I grew a little more determinationa and became less intimidation with mucking around in the bash shell. To this end, I trudged on and this is the system I came up with:&lt;/p&gt;
&lt;ol&gt;
&lt;li&gt;Download the mongo files from this page &lt;a href&#x3D;&quot;http://www.mongodb.org/downloads&quot;&gt;here&lt;/a&gt;.&lt;/li&gt;
&lt;/ol&gt;
&lt;blockquote&gt;
&lt;p&gt;if you have wget installed you can wget that bad boy and put it on the desktop like so:&lt;/p&gt;
&lt;/blockquote&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-bash&quot;&gt;wget http://fastdl.mongodb.org/osx/mongodb-osx-x86_64-2.4.8.tgz

#To extract type: 
tar -xzf http://fastdl.mongodb.org/osx/mongodb-osx-x86_64-2.4.8.tgz
&lt;/code&gt;&lt;/pre&gt;
&lt;ol start&#x3D;&quot;2&quot;&gt;
&lt;li&gt;Move the folder with all the binaries somewhere on your hard drive that you want it to permanately stay and rename it something catchy. I chose /usr/bin for mine. I figured i&#x27;d put it with the rest of my stuff.&lt;/li&gt;
&lt;/ol&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-bash&quot;&gt;mv ~/Desktop/mongodb-osx-x86_64-2.4.8 /usr/bin/m
&lt;/code&gt;&lt;/pre&gt;
&lt;ol start&#x3D;&quot;3&quot;&gt;
&lt;li&gt;Cd into /usr/bin and symlink the binaries from the folder up into the root bin dir above. ( assuming youre following it my way. ) Peep the code below for an example on this:&lt;/li&gt;
&lt;/ol&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-bash&quot;&gt;sudo ln -s /usr/bin/m/mongo mongo
sudo ln -s /usr/bin/m/mongod mongod
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;Now you can run mongo by launching the dbserver and the mongo client like so:&lt;/p&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-bash&quot;&gt;#The rest flag enables some of the clickable stuff in the web admin console. It&#x27;s optional.
mongod --rest
mongo
&lt;/code&gt;&lt;/pre&gt;
&lt;h2 id&#x3D;&quot;thecommandcheatsheet&quot;&gt;The Command Cheat Sheet&lt;/h2&gt;
&lt;ul&gt;
&lt;li&gt;&lt;em&gt;show dbs&lt;/em&gt; : shows the databases present.&lt;/li&gt;
&lt;li&gt;&lt;em&gt;use &amp;lt;dbname&amp;gt;&lt;/em&gt; : switches to that db.&lt;/li&gt;
&lt;li&gt;&lt;em&gt;show collections&lt;/em&gt; : shows the collections in a db.&lt;/li&gt;
&lt;li&gt;db.&amp;lt;collectionName&amp;gt;.insert( myVar ): inserts data into a colleciton.&lt;/li&gt;
&lt;li&gt;&lt;em&gt;db.collectionName.find( )&lt;/em&gt; : finds all records in a collection.&lt;br&gt;
&lt;em&gt;db.collectionName.find( { name: &amp;quot;Paul&amp;quot; } )&lt;/em&gt; : finds all records in a collection where the name is Paul.&lt;/li&gt;
&lt;li&gt;&lt;em&gt;db.dropDatabase( )&lt;/em&gt; : deletes a database.&lt;/li&gt;
&lt;li&gt;*db.answers.update({}, { $set: {losses: 0}}, {multi: true}); : updates all documents in a collection.&lt;/li&gt;
&lt;/ul&gt;
&lt;h2 id&#x3D;&quot;sowhatarethecaveats&quot;&gt;So what are the caveats?&lt;/h2&gt;
&lt;ul&gt;
&lt;li&gt;warning: soft rlimit is 256. Minimum should be at least 1000. If you get this error then you need to run the following command.&lt;/li&gt;
&lt;/ul&gt;
&lt;pre&gt;&lt;code class&#x3D;&quot;language-bash&quot;&gt;sudo ulimit -n 1000
#you can also check the info on this stuff with the -a flag.
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;Don&#x27;t ask me what this does. Something about the File size limits and number of processes allowed to run by the system.&lt;/p&gt;
&lt;p&gt;Ill probably update this article more in the future. As always, if you have questions, errata finds, or just want to say hi then feel free to!&lt;/p&gt;
&lt;/div&gt;
	</div>
</div>

