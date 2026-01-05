
<div class="post">
	<h1>Where do I put my code? How to organize large Angular applications using Schematics, NX, and architecture best practices.</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;What should be a module, what should be a lib, what should be a service. Nx, Xplat, Ng Console.&lt;/p&gt;
&lt;p&gt;Before we dive in, we need to touch on some component types real quick.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;smartvspresentationalcomponents&quot;&gt;Smart Vs Presentational Components&lt;/h2&gt;
&lt;p&gt;There are two types of components when building apps with uni-directional data flow. Components that &lt;em&gt;can send and recieve&lt;/em&gt; data known as &lt;strong&gt;smart components&lt;/strong&gt; and &lt;em&gt;components that only recieve data&lt;/em&gt; which are known as &lt;strong&gt;presentaional components&lt;/strong&gt;.&lt;/p&gt;
&lt;p&gt;Smart components have bi-directional communication with the rest of the app via events and actions. They manage or delegate business logic and have injected services and can have child components.&lt;/p&gt;
&lt;p&gt;Presentaional components &lt;strong&gt;only&lt;/strong&gt; communicate through inputs and outputs. Their only purpose is to render data and accept user input &lt;em&gt;but not process it&lt;/em&gt;. They emit events via events and let the other dedicated logic handle the input however it should be.&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;apps
libs
    - feature
    - utils
&lt;/code&gt;&lt;/pre&gt;
&lt;h2 id&#x3D;&quot;nxworkspaceorganizationaltypes&quot;&gt;Nx workspace organizational types&lt;/h2&gt;
&lt;h3 id&#x3D;&quot;appsdeployabletargets&quot;&gt;Apps: Deployable targets&lt;/h3&gt;
&lt;p&gt;Think of apps as shells that hold all of the logic and components and wire everything together. 95% of your code will be written in other places. Apps consist of mostly layout and routing that puts all of the other pieces together.&lt;/p&gt;
&lt;h3 id&#x3D;&quot;libs&quot;&gt;Libs&lt;/h3&gt;
&lt;p&gt;There are different types of libs&lt;/p&gt;
&lt;h4 id&#x3D;&quot;typesoflibs&quot;&gt;Types of libs&lt;/h4&gt;
&lt;p&gt;&lt;em&gt;Feature libs&lt;/em&gt; &amp;quot;contain logic pertaining to a specific domain&amp;quot;. Nrwl defined a feature lib as &amp;quot;libraries that implement smart ui (with injected services) for specific business use cases or pages in an app&amp;quot;. These contain smart components. These are usually configured via their own NgModule and can contain their own routing. They are lazy loaded into the main application from the apps directory.&lt;/p&gt;
&lt;p&gt;&lt;em&gt;Ui libs&lt;/em&gt; are presentational components. Generally there are no services injected into these components and all of their data should come from inputs.&lt;/p&gt;
&lt;p&gt;&lt;em&gt;Data Access libs&lt;/em&gt; services and utils for interacting with backend systems and code related to state management.&lt;/p&gt;
&lt;p&gt;&lt;em&gt;Util libs&lt;/em&gt;: Domain independent logic.&lt;br&gt;
In other words, this is the stuff that could be used in any app. So a storage abstraction service, caching, data manipulation logic, ect.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;resources&quot;&gt;Resources&lt;/h2&gt;
&lt;p&gt;&lt;a href&#x3D;&quot;https://blog.nrwl.io/dev-workflow-using-git-submodules-and-yarn-workspaces-14fd06c07964&quot;&gt;Dev Workflow Using Git Submodules and Yarn Workspaces&lt;/a&gt;&lt;/p&gt;
&lt;p&gt;&lt;a href&#x3D;&quot;https://nx.dev/angular/fundamentals/monorepos-automation&quot;&gt;https://nx.dev/angular/fundamentals/monorepos-automation&lt;/a&gt;&lt;br&gt;
&lt;a href&#x3D;&quot;https://blog.strongbrew.io/opinionated-guidelines-for-large-nx-angular-projects&quot;&gt;Opinionated guidelines for large angular projects&lt;/a&gt;&lt;/p&gt;
&lt;/div&gt;
	</div>
</div>

