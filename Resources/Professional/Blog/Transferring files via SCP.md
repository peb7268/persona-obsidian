
<div class="post">
	<h1>Transferring files via SCP</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;A long time ago in a galaxy far far away, we used to use FTP to upload files. Things like coda, filezilla, Dreamweaver ect. That was when the west was young and I was a baby dev. Today, there are much more robust alternatives. There are tools like Capistrano, Rocketeer, and Deployer for those who want ultimate control and prefer to do it themselves. Then there are other solutions like envoyer.io for fully integrated solutions that remove some of the legwork.&lt;/p&gt;
&lt;p&gt;Every once in a while though, You may just need to throw a quick file up on the server ( or many of them ). You may need to download a bunch of stuff or upload a bunch of stuff. In such cases most people just reach for there handy dandy FTP client again. While this solition works, it is very slow. Hence why i&#x27;m writing this post. I had to upload a bunch of images the other day to a site with no deployment system in place. I ended up using coda to upload and almost shot myself. Even on my super fast internet the process was a crawl at best. So enter SCP to save the day.&lt;/p&gt;
&lt;h4 id&#x3D;&quot;whatisscp&quot;&gt;What is SCP?&lt;/h4&gt;
&lt;p&gt;SCP is a secure copying protocol that is related to SSH. It is much quicker than FTP so let&#x27;s take a look at how it works.&lt;/p&gt;
&lt;h6 id&#x3D;&quot;downloadingafilefromremotetolocal&quot;&gt;Downloading a file from remote to local&lt;/h6&gt;
&lt;pre&gt;&lt;code&gt;#Make a local directory to test with
mkdir ~/Desktop/scpTest

#Copy the file from remote to local
scp -P 7822 root@77.38.176.171:/var/www/ghost/README.md ~/Desktop/scpTest
&lt;/code&gt;&lt;/pre&gt;
&lt;h6 id&#x3D;&quot;uploadingafilefromlocaltoremote&quot;&gt;Uploading a file from local to remote&lt;/h6&gt;
&lt;pre&gt;&lt;code&gt;scp -P 7822 ~/Desktop/scpTest/scp_readme.md root@77.38.176.171:/var/www/ghost
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;Notice that with these two the order of things is just reversed. In the first example, downloading a file, you specify the server first. In example two, uploading a file, you specify the file to upload first. Also take note of the -P flag to specify a custom port.&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;If your host required a custom port and you don&#x27;t specify the port with the &lt;strong&gt;-P&lt;/strong&gt; flag then the default port will be attempted and the connection will be unsuccessful.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;h6 id&#x3D;&quot;uploadingentiredirectoriesfromlocaltoremote&quot;&gt;Uploading entire directories from local to remote&lt;/h6&gt;
&lt;pre&gt;&lt;code&gt;#Copies the local directory scpTest to the scpDemo directory on remote.
scp -P 7822 -r ~/Desktop/scpTest/ root@77.38.176.171:/var/www/scpDemo
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;The thing to note here is just the inclusion of the &lt;strong&gt;-r&lt;/strong&gt; recursive flag. As you would imagine copying directories from remote to local can be done in the inverse way as we did with files above. Just don&#x27;t forget the recursive flag.&lt;/p&gt;
&lt;h5 id&#x3D;&quot;conclusion&quot;&gt;Conclusion&lt;/h5&gt;
&lt;p&gt;SCP is faster and more secure than FTP. In addition, it&#x27;s more convinient once you get the syntax down. So when you cant use a git based deployment solution and you have to transfer some stuff manually, don&#x27;t hesitate to stay in the terminal.&lt;/p&gt;
&lt;p&gt;Until next time. Same Bat time, Same Bat channel.&lt;/p&gt;
&lt;/div&gt;
	</div>
</div>

