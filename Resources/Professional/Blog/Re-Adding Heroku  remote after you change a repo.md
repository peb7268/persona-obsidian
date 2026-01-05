
<div class="post">
	<h1>Re-Adding Heroku  remote after you change a repo</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;So what if you want to add Heroku as a remote to a repo you already have on your machine, or maybe something went catastrophically wrong and you had to blow away a repo and now want to put your push setup back like it was.&lt;/p&gt;
&lt;p&gt;I&#x27;ll save you from having to go dig around Heroku&#x27;s docs or stackoverflow. Here ya go:&lt;/p&gt;
&lt;p&gt;&lt;code&gt;heroku git:remote -a &amp;lt;app-name&amp;gt;&lt;/code&gt;&lt;/p&gt;
&lt;p&gt;Where app name is what you called your app when you created it. You can find this under settings in Heroku if you&#x27;re not sure or cant remember.&lt;/p&gt;
&lt;/div&gt;
	</div>
</div>

