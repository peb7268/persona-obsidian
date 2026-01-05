
<div class="post">
	<h1>Deploying Ghost 1.X to Heroku</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;Ghost is a great blogging tool, however there are some new caveats to look out for when using Ghost 1.X on you site.&lt;/p&gt;
&lt;p&gt;Assuming you&#x27;ve been though the process described here :&lt;br&gt;
&lt;a href&#x3D;&quot;https://docs.ghost.org/v1.0.0/docs/using-ghost-as-an-npm-module&quot;&gt;https://docs.ghost.org/v1.0.0/docs/using-ghost-as-an-npm-module&lt;/a&gt;&lt;br&gt;
The first problem you will notice is that if you&#x27;re using a public repository, you&#x27;ll be commiting your config files with all your DB creds in it...ew.&lt;/p&gt;
&lt;p&gt;Heroku has enviormental varibles, but how do we get Ghost to recognize them and use them for our database connection? Simple:&lt;br&gt;
&lt;code&gt;$ heroku config:set \ database__connection__user&#x3D;username \ database__connection__password&#x3D;password \ database__connection__host&#x3D;host \ database__connection__database&#x3D;db&lt;/code&gt;&lt;/p&gt;
&lt;p&gt;You should have all of these from when you created your Heroku app and its SQL database. Ghost will update the &lt;mark&gt;database&lt;/mark&gt; object in your prodution JSON file accordingly.&lt;/p&gt;
&lt;p&gt;All that&#x27;s left is to initialize your Database! Run &lt;code&gt;heroku run &amp;quot;knex-migrator init&amp;quot;&lt;/code&gt; and you&#x27;re all good to go!&lt;/p&gt;
&lt;/div&gt;
	</div>
</div>

