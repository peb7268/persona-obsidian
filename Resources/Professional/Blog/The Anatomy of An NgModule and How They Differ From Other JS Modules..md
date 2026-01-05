
<div class="post">
	<h1>The Anatomy of An NgModule and How They Differ From Other JS Modules.</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;Angular NgModules are classes that have special decorators and meta data. Every Angular application has at least one of these modules. It is known as the &lt;strong&gt;root module&lt;/strong&gt;. Often though, an aplication is composed of an interconnected group of NgModules all tied together by the root module.&lt;/p&gt;
&lt;p&gt;First off, the world of JavaScript has a complicated relationship with modules. There are so many types. There are AMD modules, CommonJS modules, and now ES2015 modules. These are all different from NgModules ways of making vanilla modules in the javascript language. Angular works with &lt;a href&#x3D;&quot;https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export&quot;&gt;ES2015 modules &lt;/a&gt;by default when using the CLI and adds them to it&#x27;s own NgModule system to compose your application&#x27;s environment. Think of NgModule as an Angular abstraction that sits on top of your gluing it all together.&lt;/p&gt;
&lt;p&gt;Now that you know a bit of context, let&#x27;s look at some of the characteristics of NgModules.&lt;/p&gt;
&lt;ol&gt;
&lt;li&gt;By convention they are usually in their own file.&lt;/li&gt;
&lt;li&gt;They describe to angular what classes angular knows about.&lt;/li&gt;
&lt;li&gt;Multiple NgModules are typically composed together to create an angular application.&lt;/li&gt;
&lt;li&gt;They are created by using the &lt;strong&gt;@NgModule&lt;/strong&gt; decorator.&lt;/li&gt;
&lt;/ol&gt;
&lt;h2 id&#x3D;&quot;ngmodulestellangularwhichclassesitknowsaboutandhowtobuildandlaunchtheapplication&quot;&gt;NgModules tell angular which classes it knows about and how to build and launch the application.&lt;/h2&gt;
&lt;p&gt;This is done in five ways:&lt;/p&gt;
&lt;ol&gt;
&lt;li&gt;declarations: &lt;a href&#x3D;&quot;https://angular.io/guide/ngmodule-faq#q-declarable&quot;&gt;Delcarable classes&lt;/a&gt;, these are components, directives, and pipes.&lt;/li&gt;
&lt;li&gt;imports: are for importing entire other modules.&lt;/li&gt;
&lt;li&gt;exports: declarable items it owns or has imported from other modules.&lt;/li&gt;
&lt;li&gt;providers: tell angular&#x27;s DI system how to inject something into a class. These are typically services.&lt;/li&gt;
&lt;li&gt;bootstrap: This tells angular what the root component is that gets put into the index file.&lt;/li&gt;
&lt;/ol&gt;
&lt;h2 id&#x3D;&quot;therootmodule&quot;&gt;The Root Module&lt;/h2&gt;
&lt;p&gt;This is where the app is glued together. It&#x27;s top level services, components, modules, pipes and ect are all imported here and angular is told about what it can manage and control. All of the metadata associated with the @NgModule decorator is what tells Angular &lt;a href&#x3D;&quot;https://angular.io/guide/bootstrapping&quot;&gt;how to compile and run the application&lt;/a&gt;.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;composingfunctionalitythroughmoduleimports&quot;&gt;Composing functionality through module imports&lt;/h2&gt;
&lt;p&gt;Modules provide a way to group related business logic, services and components together. An application that has any size, scope, or complexity at all is usually a grouping of discrete modules into one unified application. For example, an app like Amazon has catalog logic, shipping logic, shopping cart logic that all combine to serve one purpose, an e-commerce experience.&lt;/p&gt;
&lt;p&gt;Since your application starts with a root &lt;strong&gt;NgModule&lt;/strong&gt; you can think of that as an ECommerceModule in this example. That may import a ShoppingCartModule, a CatalogModule, and so on.&lt;/p&gt;
&lt;p&gt;Modules can export declarable classes. This means any components, pipes, or directives you wish to make public to other parts of your root module can be added to an NgModule&#x27;s &lt;code&gt;exports&lt;/code&gt; property. This makes them &lt;em&gt;public&lt;/em&gt; classes. In addition, that&#x27;s not the only way to extend the root application. &lt;mark&gt;Providers added to a bootstrapped module&#x27;s providers array become public for the entire application&lt;/mark&gt;. This is because when an NgModule get&#x27;s imported into the root application, it&#x27;s providers get added to the root injector. If the concepts of root injectors and Angular&#x27;s DI system is unfamiliar to you there is a great article at &lt;a href&#x3D;&quot;https://blog.thoughtram.io/angular/2015/05/18/dependency-injection-in-angular-2.html&quot;&gt;thoughtram&lt;/a&gt; about it.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;sharingangularmodulesasapackage&quot;&gt;Sharing Angular Modules As A Package&lt;/h2&gt;
&lt;p&gt;There is yet another type of module to be aware of, the &lt;strong&gt;feature module&lt;/strong&gt;. A feature module is exaclt the same as a regular NgModule. It&#x27;s just a collection of of components, directives and services that are grouped together to implement a feature. You can see more on this &lt;a href&#x3D;&quot;https://angular-2-training-book.rangle.io/handout/modules/feature-modules.html&quot;&gt;here&lt;/a&gt;.&lt;/p&gt;
&lt;/div&gt;
	</div>
</div>

