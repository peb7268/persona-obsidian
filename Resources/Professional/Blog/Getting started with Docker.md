
<div class="post">
	<h1>Getting started with Docker</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;h4 id&#x3D;&quot;firststepsisthisthingon&quot;&gt;First Steps: Is this thing on?&lt;/h4&gt;
&lt;p&gt;To test it out and see if Docker is working you can run&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;docker run hello-world
&lt;/code&gt;&lt;/pre&gt;
&lt;h2 id&#x3D;&quot;alittlehistorycontainersvsvms&quot;&gt;A little history: Containers vs VM&#x27;s&lt;/h2&gt;
&lt;ul&gt;
&lt;li&gt;resource usage&lt;/li&gt;
&lt;li&gt;layer diagrams&lt;/li&gt;
&lt;/ul&gt;
&lt;h4 id&#x3D;&quot;basicdockervernacular&quot;&gt;Basic Docker Vernacular&lt;/h4&gt;
&lt;p&gt;Image: an image is like a portable copy of an OS.&lt;br&gt;
Container: a container is a running instance of an image&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;In other words, an image is the &lt;mark&gt;template&lt;/mark&gt; and container is the &lt;mark&gt;instance&lt;/mark&gt;.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;h2 id&#x3D;&quot;theskinnyonimages&quot;&gt;The Skinny on Images&lt;/h2&gt;
&lt;p&gt;images are made of layers.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;containerscontinued&quot;&gt;Containers Continued&lt;/h2&gt;
&lt;h4 id&#x3D;&quot;containerbasics&quot;&gt;Container Basics&lt;/h4&gt;
&lt;p&gt;Containers should be treated as ephemeral and immutable. Ephemeral like the heroku file system and immutable meaning that you cant make changes and persist them in between runnings of the os.&lt;/p&gt;
&lt;p&gt;To run a container you just say: &lt;code&gt;docker run &amp;lt;image_name&amp;gt;&lt;/code&gt; and poof, docker will run a container based off of your image name. If that image isnt on your computer already, it will grab the image off of a registry, download it, and then run it.&lt;/p&gt;
&lt;p&gt;If you dont specify a process to run when you start the container, then when the container starts it will run the default process from the image. You can find the default process of an image by inspecting the image with docker inspect and looking for the &lt;em&gt;Cmd&lt;/em&gt; instruction. When you pass a process paramater when you start the container it will override the Cmd instruction.&lt;/p&gt;
&lt;p&gt;Conversely, if the &lt;em&gt;Entrypoint&lt;/em&gt; instruction is used instead of Cmd when you pass process arguments when starting a container, it will append arguments to entrypoint instead of replacing it.&lt;/p&gt;
&lt;p&gt;When containers run, they take over the terminal. To prevent this, you can pass the &lt;code&gt;-d&lt;/code&gt; flag. This runs the container in &lt;em&gt;dettatched&lt;/em&gt; mode, meaning it runs in the background.&lt;/p&gt;
&lt;p&gt;Most of the time, when you run a container, you want to bind a port on your local machine to a port in the docker file so that you can access the process(s) in your docker container from your browser of client machine. This is done by passing the &lt;code&gt;-p&lt;/code&gt; flag along with a colon seperated port pairing like so:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;docker container run nodeimg -p 80:3000
&lt;/code&gt;&lt;/pre&gt;
&lt;h4 id&#x3D;&quot;dockerizinganappbuildingadockerimagefromadockerfilerunningit&quot;&gt;Dockerizing an App: Building a docker image from a Dockerfile &amp;amp; running it&lt;/h4&gt;
&lt;ol&gt;
&lt;li&gt;Make a Dockerfile&lt;/li&gt;
&lt;li&gt;Run the docker build command &lt;code&gt;docker build -t nodeimg .&lt;/code&gt; Where -t tags / names the image.&lt;/li&gt;
&lt;li&gt;Run the image as a container &lt;code&gt;docker run -p 4000:80 nodeimg&lt;/code&gt;&lt;/li&gt;
&lt;/ol&gt;
&lt;ul&gt;
&lt;li&gt;This maps port 4000 on the host machine to port 80 in the container.*&lt;/li&gt;
&lt;/ul&gt;
&lt;h2 id&#x3D;&quot;microservicesrunningmultiplecontainersatonce&quot;&gt;Microservices: Running multiple containers at once&lt;/h2&gt;
&lt;p&gt;To do this you use the &lt;code&gt;docker-compose.yml&lt;/code&gt; file. This is where you describe what should be running, how it should be running, and how it&#x27;s all tied together.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;thecheatsheet&quot;&gt;The Cheat Sheet&lt;/h2&gt;
&lt;h4 id&#x3D;&quot;imagecommands&quot;&gt;Image commands:&lt;/h4&gt;
&lt;p&gt;Shows all availible images: &lt;code&gt;docker image ls&lt;/code&gt;&lt;br&gt;
Remove an image: &lt;code&gt;docker image rm &amp;lt;image_name_or_id&amp;gt;&lt;/code&gt;&lt;/p&gt;
&lt;h4 id&#x3D;&quot;containercommands&quot;&gt;Container commands&lt;/h4&gt;
&lt;p&gt;See all running containers: &lt;code&gt;docker ps -a&lt;/code&gt;&lt;br&gt;
To stop a container: &lt;code&gt;docker container stop &amp;lt;container_name&amp;gt;&lt;/code&gt;&lt;br&gt;
and conversely to start: &lt;code&gt;docker container start &amp;lt;container_name&amp;gt;&lt;/code&gt;&lt;br&gt;
Stop and remove the container: &lt;code&gt;docker container rm -f webserver&lt;/code&gt;&lt;/p&gt;
&lt;h4 id&#x3D;&quot;restartingacontainervscreatinganewimage&quot;&gt;Restarting a container vs creating a new image&lt;/h4&gt;
&lt;p&gt;If you execute &lt;code&gt;docker run -p 4000:80 &amp;lt;image_name&amp;gt;&lt;/code&gt; a new image is made each time but if you run &lt;code&gt;docker start -ai &amp;lt;container_name&amp;gt;&lt;/code&gt; after the first image is created it will just recycle and rerun the first image.&lt;/p&gt;
&lt;h4 id&#x3D;&quot;nowthatyouhaveacontainerhowdoyougetintoit&quot;&gt;Now that you have a container how do you get into it?&lt;/h4&gt;
&lt;p&gt;You ssh into it of course. That is done like so:&lt;/p&gt;
&lt;ol&gt;
&lt;li&gt;docker ps to get the name of the container&lt;/li&gt;
&lt;li&gt;run a command against it like so:&lt;/li&gt;
&lt;/ol&gt;
&lt;pre&gt;&lt;code&gt;docker exec -it sharp_hodgkin /bin/bash
&lt;/code&gt;&lt;/pre&gt;
&lt;h4 id&#x3D;&quot;todebugifthecontainerwontstart&quot;&gt;To debug if the container wont start&lt;/h4&gt;
&lt;p&gt;To run the image directly and poke around run:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;docker run -it nodeimg /bin/bash
&lt;/code&gt;&lt;/pre&gt;
&lt;blockquote&gt;
&lt;p&gt;Note that the &lt;em&gt;-it&lt;/em&gt; flags in the previous two steps launch the container in &lt;strong&gt;interactive terminal mode&lt;/strong&gt;&lt;/p&gt;
&lt;/blockquote&gt;
&lt;p&gt;Let&#x27;s disect that last command a bit more:&lt;br&gt;
If you were to break it into the named parts it would look like this:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;docker &amp;lt;command&amp;gt; &amp;lt;flags&amp;gt; &amp;lt;image_name&amp;gt; &amp;lt;process_name&amp;gt;
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;Of course, if the image is not present on the machine, it will go and grab a copy of it from the default docker registry, &lt;em&gt;hub.docker.com&lt;/em&gt;.&lt;/p&gt;
&lt;p&gt;When a container finishes running the main process it will exit. So if you were to exit the bash shell above, the container will stop. To prevent this, you can use &lt;code&gt;ctrl + p + q&lt;/code&gt; to exit the main process but not stop the container from running.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;gettingmoreinfo&quot;&gt;Getting more info&lt;/h2&gt;
&lt;p&gt;To diagnose things you can do some of the following steps:&lt;br&gt;
&lt;code&gt;docker info&lt;/code&gt;: which will give you info about everything going on with docker. If you want more info about an image, you can do &lt;code&gt;docker inspect &amp;lt;img_name&amp;gt;&lt;/code&gt;.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;dockernetworking&quot;&gt;Docker Networking&lt;/h2&gt;
&lt;p&gt;When you have services in a docker-compose file running, when you run &lt;code&gt;dc up&lt;/code&gt; a new network is created using the root app folder name and the network name. If no network is specified the network suffix &lt;code&gt;default&lt;/code&gt; will be used. So if your app is in a folder called &lt;code&gt;myapp&lt;/code&gt; with no network specified, the network name would be &lt;code&gt;myapp_default&lt;/code&gt;. However if you have a network name of &lt;code&gt;appnetwork&lt;/code&gt; the full network name would be &lt;code&gt;myapp_appnetwork&lt;/code&gt;.&lt;/p&gt;
&lt;p&gt;When &lt;code&gt;dc&lt;/code&gt; is used in default networking modes, services running on the same host become network names. To illustrate, let&#x27;s say we have a database service called &lt;code&gt;db&lt;/code&gt; which runs on the default mysql port of &lt;code&gt;3306&lt;/code&gt; and the webapp service on port &lt;code&gt;3000&lt;/code&gt;. The webapp service could then talk to the db service with the hostname &lt;code&gt;db:3306&lt;/code&gt; and the webapp service would be reachable on &lt;code&gt;webapp:3000&lt;/code&gt;.&lt;/p&gt;
&lt;/div&gt;
	</div>
</div>

