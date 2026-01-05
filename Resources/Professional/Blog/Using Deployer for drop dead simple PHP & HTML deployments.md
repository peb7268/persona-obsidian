
<div class="post">
	<h1>Using Deployer for drop dead simple PHP &amp; HTML deployments</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;h3 id&#x3D;&quot;preface&quot;&gt;Preface&lt;/h3&gt;
&lt;p&gt;This article is going to walk you through how to create a modern workflow for local development with exceptional deployments. There will be a brief intro into local dev environments but the main technical explanations in this article will center on deployments. For more info on any part just hit up the comments or shoot me a tweet.&lt;/p&gt;
&lt;p&gt;So I was working on a WordPress site the other day and I keep finding myself in need of deploying updates. It&#x27;s for a small client that isn&#x27;t a big budget project so I was trying to avoid setting up something like &lt;strong&gt;capistrano&lt;/strong&gt; for deployments. The problem is though, after the initial deployment, any tweaks and changes I make are kind of confusing to sync.&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;&lt;strong&gt;Deploment&lt;/strong&gt;: To migrate your local code to a remote environment.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;h5 id&#x3D;&quot;lookingdeeperattheproblemsmallchangesmediumheadaches&quot;&gt;Looking deeper at the problem: Small Changes &#x3D; Medium Headaches&lt;/h5&gt;
&lt;p&gt;For a modern workflow, most people are using things like SASS, Gulp, browser-sync / livereload, and other build tools. These are awesome when you are working on a local environment. What happens though when the client calls you and requests a simple JavaScript or CSS change.&lt;/p&gt;
&lt;p&gt;I work in a VM so to do things right, you have to switch over to the VM, boot up vagrant, start up gulp and then start doing whatever. When you make the change you then have to push it to Github or whatever you&#x27;re using for VC and then after all that you have to manually copy the files you have changed up to the server. This is a pain to keep synced, keep current. Not the kind of workflow we expect in this modern age of development.&lt;/p&gt;
&lt;h5 id&#x3D;&quot;abetterwaylocaldevelopmentwithdeploytools&quot;&gt;A better way: Local development with deploy tools.&lt;/h5&gt;
&lt;p&gt;So what&#x27;s the best way to get up and running with a modern development environment? Well, I can tell you my way ( which I think is best ;) ). First, we need to get setup with a VM. If you are running PHP this is a must. If you are running Node then it&#x27;s more at your discretion. It depends on how seperate you want to keep your computer vs your development environment.&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;&lt;strong&gt;VM&lt;/strong&gt;: Virtual machine. A VM is used to create a custom server / environment for each project you work on.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;p&gt;&lt;em&gt;VM&#x27;s are good because they keep all of the configurations, all of the custom packages, and all of the tools a project needs from cluttering up your local machine.&lt;/em&gt;&lt;/p&gt;
&lt;p&gt;If you have never used a VM just think of it as when you run Windows on your Mac. The native OS is Mac OSX but you can run windows at the same time by running it in a VM.&lt;/p&gt;
&lt;h5 id&#x3D;&quot;whatvmenviromentshouldiuse&quot;&gt;What VM enviroment should I use?&lt;/h5&gt;
&lt;p&gt;The setup I use is Vagrant and VVV. To me it is the easiest to use and the most flexible. Docker has become the cool tool though for provisioning VM&#x27;s lately though. What are the advantages to using a VM?&lt;/p&gt;
&lt;ol&gt;
&lt;li&gt;Doing installs from Bower, Composer, and NPM don&#x27;t clutter up your machine.&lt;/li&gt;
&lt;li&gt;You can configure each environment you use to match your staging and production environments exaclty.&lt;/li&gt;
&lt;li&gt;If you break something you can just throw the VM out and start over.&lt;/li&gt;
&lt;/ol&gt;
&lt;h3 id&#x3D;&quot;enoughofthejibberjabberletsdeployourcode&quot;&gt;Enough of the Jibber Jabber. Let&#x27;s Deploy our code.&lt;/h3&gt;
&lt;p&gt;So once you get your local dev environment setup and you get some code that you want to deploy what&#x27;s next? You could reach for an FTP client, but that strategy is older than Viggo the Carpathian&#x27;s wardrobe. The new, and legit way is to use a deploy tool.&lt;/p&gt;
&lt;p&gt;Deploy tools let you just exectue a command on the CLI and then boom, you&#x27;re code gets pushed from your SCM ( source control manager ) to your desired location: either a staging server or production. In addition, most deploy tools create an environment on your servers where each deployment gets put in a folder called releases, where each release is marked by a timestamp. The deployment tool then creates a symlink called current that points to the latest release. Then you just have to tell your sever to point to the current symlink in your server configs.&lt;/p&gt;
&lt;p&gt;There are many options out there for deployment tools. There are services that have their own tools built in like Heroku, or Envoyer. Then there are stand alone options that give you all of the control. Those are the solutions I tend to lean twoards. I have used &lt;strong&gt;Capistrano&lt;/strong&gt;, which is a ruby tool, and &lt;strong&gt;Deployer&lt;/strong&gt; which is written in PHP. I also came accross one that is called Rocketeer which looks pretty cool. The one we are going to go with in this post though is Deployer.&lt;/p&gt;
&lt;h4 id&#x3D;&quot;installation&quot;&gt;Installation&lt;/h4&gt;
&lt;p&gt;Installing it is dead simple. You just go to their &lt;a href&#x3D;&quot;http://deployer.org/&quot;&gt;website&lt;/a&gt; and download the phar file. Once you get the phar file you move it to a place that&#x27;s in your executable path. Once you move it, then you have to change the permissions on it to make it executable.&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;#The reccomended path to move it to
mv deployer.phar /usr/local/bin/dep

#Make it executable
chmod +x /usr/local/bin/dep
&lt;/code&gt;&lt;/pre&gt;
&lt;blockquote&gt;
&lt;p&gt;For those that don&#x27;t know, a &lt;strong&gt;.phar&lt;/strong&gt; file is just a PHP archive. It&#x27;s a bundle of PHP code that&#x27;s executable on the command line.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;h4 id&#x3D;&quot;theprojectconfigfiledeployphp&quot;&gt;The project config file: deploy.php&lt;/h4&gt;
&lt;p&gt;Once you get the phar file installed it is accessible globally. Each project though will have a config file to tell it where it can deploy to and how to deploy there. That file is called &lt;em&gt;deploy.php&lt;/em&gt;. Here is an example:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;&amp;lt;?php

require &#x27;recipe/wordpress.php&#x27;;

server(&#x27;prod&#x27;, &#x27;69.125.294.164&#x27;, 22)
-&amp;gt;user(&#x27;your_username&#x27;)
-&amp;gt;password(&#x27;your_password&#x27;)
-&amp;gt;stage(&#x27;production&#x27;)
-&amp;gt;env(&#x27;deploy_path&#x27;, &#x27;/home5/your_user/public_html/folder/wp-content/themes&#x27;); 

set(&#x27;repository&#x27;, &#x27;https://github.com/your_handle/your_repo.git&#x27;);
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;Boom, that&#x27;s it. You&#x27;re ready to go after that. Next, you should be able to run &lt;code&gt;dep&lt;/code&gt; and then you will get a list of commands that looks something like:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;Deployer version 3.0.10

Usage:
  command [options] [arguments]

Options:
  -h, --help            Display this help message
  -q, --quiet           Do not output any message
  -V, --version         Display this application version
      --ansi            Force ANSI output
      --no-ansi         Disable ANSI output
  -n, --no-interaction  Do not ask any interactive question
  -f, --file[&#x3D;FILE]     Specify Deployer file.
      --tag[&#x3D;TAG]       Tag to deploy.
  -v|vv|vvv, --verbose  Increase the verbosity of messages: 1 for normal output, 2 for more verbose output and 3 for debug

Available commands:
  cleanup             Cleaning up old releases
  current             Show current release.
  deploy              Deploy your project
  help                Displays help for a command
  list                Lists commands
  rollback            Rollback to previous release
  self-update         Updates deployer.phar to the latest version
  worker              Deployer uses workers for parallel deployment.
 deploy
  deploy:copy_dirs    Copy directories
  deploy:prepare      Preparing server for deploy
  deploy:release      Prepare release
  deploy:shared       Creating symlinks for shared files
  deploy:symlink      Creating symlink to release
  deploy:update_code  Updating code
  deploy:vendors      Installing vendors
  deploy:writable     Make writable dirs
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;If you see the deploy command there then all you have to do to deploy is type &lt;code&gt;dep deploy production&lt;/code&gt; to deploy to production. Since we only have production in our deploy.php that&#x27;s all we can deploy to, but if we had a staging config you could push to either location.&lt;/p&gt;
&lt;h3 id&#x3D;&quot;casestudydeployingwordpresstosharedhosting&quot;&gt;Case study: Deploying WordPress to shared hosting.&lt;/h3&gt;
&lt;p&gt;I deployed this clients code to &lt;em&gt;Bluehost&lt;/em&gt; so that&#x27;s who we&#x27;ll use for this explanation. First off, the docs for deployer say to put your deploy.php in the root directory of your project. For WordPress I think that would be the part that has the wp-content folder and all that stuff, top level. To me though, it&#x27;s stupid to deploy and track in VC a whole version of whatever you&#x27;re working with when you are only really using the theme folder. So, we will be putting our deploy.php file in the theme folder. It will act as our root.&lt;/p&gt;
&lt;h4 id&#x3D;&quot;settingupthewordpresstounderstandthedeployerdirectorystructure&quot;&gt;Setting up the WordPress to understand the deployer directory structure.&lt;/h4&gt;
&lt;p&gt;So recall that when deployer create&#x27;s a deployment, it uses this structure:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;#Our wp-content/themes directory
./
../
current
releases
    20151031212204
    20151031213934
    20151031215230
shared
index.php
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;Current, releases, and shared were all created by our deploy tool as well as each release in releases.&lt;/p&gt;
&lt;p&gt;So when wordpress scans this directory, it sees the symlink current and thinks it&#x27;s the theme, instead of a shortcut pointing to the release, which is actually the theme. If you are deplying a whole project instead of a wordpress theme, you just have to configure your server to point to the &lt;em&gt;current&lt;/em&gt; symlink. On Bluehost you can point the site home in the Cpanel under the domain manager option.&lt;/p&gt;
&lt;h3 id&#x3D;&quot;conclusionsayhellotoyourmodernworkflow&quot;&gt;Conclusion: say hello to your modern workflow&lt;/h3&gt;
&lt;p&gt;So to sum things up, now you can work locally. Develop your projects on your computer while it behaves just like the real site with the real URL. Then when you&#x27;re done you push the code to github, then run your deploy command and boom. Always up to date, synced code that&#x27;s a joy to work with has never been easier.&lt;/p&gt;
&lt;/div&gt;
	</div>
</div>

