
<div class="post">
	<h1>TypeScript, Type Definitions, and modular JavaScript in an Angular World</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;In the plainest terms, TypeScript ( referred to as TS in the duration of this article ) is a way to provide strong typing to your JavaScript code. In other words, it enables you to create code that behaves predicably and consistently by making sure X variable is always the type of data you meant it to be. That way you dont have some variable that&#x27;s an integer that accidentally saves some number input as a string and then screws up your application. Let&#x27;s look at a quick example for clarification.&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;let myBalance: Int &#x3D; 300.00;
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;That&#x27;s the simplest example. Now anytime I use myBalance anywhere, my code insures that the value im using will be an integer. If I try to set it later to a string like &lt;code&gt;myBalance &#x3D; &#x27;300.00&#x27;&lt;/code&gt; then TypeScript will throw an error for me.&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;TODO: Add an example of an interface and explain that concept&lt;/p&gt;
&lt;/blockquote&gt;
&lt;p&gt;That&#x27;s the basis for what TypeScript is.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;butwaittheresmorewhatdoestsgiveme&quot;&gt;But Wait... There&#x27;s more: What does TS give me?&lt;/h2&gt;
&lt;p&gt;If one were to stop there, you could say that&#x27;s a nice addition but not a major upgrade to the language. JavaScript has been a language that has been evolving rapidly over the past few years. Between all of the frameworks like Angular, React, Vue and the constant iterations of JS Specs, the language continues to push new boundaries. With that being said, every browser has a different set of the newest JS features that it has adopted. One browser may support lexical scoping while another may not, while another may support const and let keywords while a different one doesnt.&lt;/p&gt;
&lt;p&gt;Typically, in order to use the latest JS features you have to use compiler libraries like Babel or Traceur. TS allows you to use next gen JavaScript right now. In addition to typings that TS provides, it gives you access to almost if not all of the ES2015 spec so you can do things like classes and interfaces right out of the box. It does this by using the TSC compiler tool that comes with TS and it compiles your advanced JS down to basic JS that all browsers understand. We&#x27;ll look more at this later.&lt;/p&gt;
&lt;p&gt;Beyond language interpolation and compilation TS also gives many modern IDE&#x27;s code hints as you work! VSCode calls these Intellisense. As you hover over a variable, class, or other element Vscode will reccomend what you need to implement said item. It will highlight when you dont use the right number of arguments in a function call, the wrong variable type somewhere, or when you forget to import a file. It&#x27;s magic. How is this black magic done you ask? TS uses the interfaces and type hints you define as you write your code. What if I use a third party library you may ask? Not to worry, TS can actually load what are called &lt;em&gt;type definition files&lt;/em&gt; usually named like &lt;code&gt;myFile.d.ts&lt;/code&gt; and that actually defines types for how the library should behave. Pretty amazing. Many libraries like jQuery or Jasmine even have type definitions already written. These can be installed or managed via NPM. TS has even gotten so popular that there is a repository just for searching types. It&#x27;s like NPM for TypeScript and it&#x27;s called DefinatelyTyped.&lt;/p&gt;
&lt;p&gt;The thing I like most about TypeScript is how it allows you to organize your code. ES2015 allows you to organize your code into packages of related functionality called modules. This concept has been around for ever but has become a trend and a reality in the JS world only in the past few years. In the past, people used to use things like requirejs or browserify to create AMD or CommonJS modules and then import them. CommonJS being the type that node supports. People have gone back and forth over where to use each of these and why each is better. The constant back forth,, pro&#x27;s and con&#x27;s of each, and the sheer popularity of both led to the creation of the &lt;strong&gt;UMD&lt;/strong&gt; or &lt;strong&gt;Universal Module Definition&lt;/strong&gt; standard. It is basically a wrapper that exports both types depending on whichever is defined. jQuery is a library which implements such things.&lt;/p&gt;
&lt;p&gt;Regardless, in order to use modules and classes in JavaScript in the browser, you have to use a bundler or tool of some kind. TypeScript also handles this for us. Not only does it handle this for you, but it allows you to create knicknames or aliases if you were to modules. So instead of importing myLib from a super long name, you can use a shortcut to give it a nice name. Like so:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;import { myLib } from &#x27;vendors/somelib/somefolder/dist/file&#x27;;

becomes:

import { myLib } from &#x27;libs/file&#x27;;
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;You can check out more on this importing topic by looking at the NgModules post here.&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;TODO: link this up&lt;/p&gt;
&lt;/blockquote&gt;
&lt;p&gt;This among other settings is done through TS&#x27;s configuration which you set in a file called &lt;strong&gt;.tsconfig&lt;/strong&gt;.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;thetsconfigjsonfile&quot;&gt;The .tsconfig.json file&lt;/h2&gt;
&lt;p&gt;.tsconfig is where the magic happens. Let&#x27;s take a look at an example from angular and then we&#x27;ll go over some of the properties.&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;&amp;quot;compilerOptions&amp;quot;: {
    &amp;quot;sourceMap&amp;quot;: true,
    &amp;quot;declaration&amp;quot;: false,
    &amp;quot;moduleResolution&amp;quot;: &amp;quot;node&amp;quot;,
    &amp;quot;emitDecoratorMetadata&amp;quot;: true,
    &amp;quot;experimentalDecorators&amp;quot;: true,
    &amp;quot;module&amp;quot;: &amp;quot;commonjs&amp;quot;,
    &amp;quot;target&amp;quot;: &amp;quot;es5&amp;quot;,
    &amp;quot;types&amp;quot;: [
      &amp;quot;jasmine&amp;quot;,
      &amp;quot;jquery&amp;quot;,
      &amp;quot;semantic-ui&amp;quot;,
      &amp;quot;mongoose&amp;quot;,
		&amp;quot;dotenv&amp;quot;,
		&amp;quot;graphql&amp;quot;
    ],
    &amp;quot;typeRoots&amp;quot;: [
      &amp;quot;node_modules/@types&amp;quot;
    ],
    &amp;quot;lib&amp;quot;: [
      &amp;quot;es2017&amp;quot;,
		&amp;quot;dom&amp;quot;,
		&amp;quot;esnext&amp;quot;
    ],
    &amp;quot;baseUrl&amp;quot;: &amp;quot;.&amp;quot;,
    &amp;quot;paths&amp;quot;: {
      &amp;quot;@myworkspace/*&amp;quot;: [
        &amp;quot;libs/*&amp;quot;
      ]
    }
  },
  &amp;quot;exclude&amp;quot;: [
    &amp;quot;node_modules&amp;quot;,
    &amp;quot;tmp&amp;quot;
  ]
}
&lt;/code&gt;&lt;/pre&gt;
&lt;h4 id&#x3D;&quot;types&quot;&gt;Types&lt;/h4&gt;
&lt;p&gt;The &lt;em&gt;types&lt;/em&gt; will include all type defs in the &lt;code&gt;node_modules/@types&lt;/code&gt; directory by default. Antying in definately typed can be added there via npm. If you specify the &lt;strong&gt;types&lt;/strong&gt; property though, only types listed there will be included. Furthermore, setting the typeroot property means that TS will only look at types in that specified directory, not the standard @types directory. This is handy if you want to change the directory where type definitions are stored or something.&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;If you have &lt;em&gt;types&lt;/em&gt; defined in your compilerOptions, only these types will be checked against by TSC.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;h4 id&#x3D;&quot;libs&quot;&gt;Libs&lt;/h4&gt;
&lt;p&gt;TS checks against a standard set of rules. This set is determined by the &lt;strong&gt;target&lt;/strong&gt;. Which version of JS you&#x27;re going for (ES5, ES6, ect..).  This list of standard ruls is called the &lt;em&gt;libs&lt;/em&gt;. The standard libs checked against will be different depending on which target you select.&lt;/p&gt;
&lt;p&gt;In additon to the default libs used, you may add your own libs or overwrite the standard ones that will be used. The &lt;em&gt;lib&lt;/em&gt; property is a set of definitions for to check against.&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;By setting the lib property, you are telling TS to only check against libs in that set.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;h4 id&#x3D;&quot;baseurlandpathsaliasesthatmakehandsomeimports&quot;&gt;BaseUrl and Paths: Aliases that make handsome imports&lt;/h4&gt;
&lt;p&gt;As mentioned above, rather than having a nasty import&lt;br&gt;
you can set aliases and use those for convinience.&lt;/p&gt;
&lt;p&gt;By default, TS uses relative paths for &lt;a href&#x3D;&quot;https://www.typescriptlang.org/docs/handbook/module-resolution.html#base-url&quot;&gt;module resolution&lt;/a&gt;. When you set the &lt;strong&gt;baseUrl&lt;/strong&gt; property you tell it to circumvent that and look for a corresponding property in the paths property.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;advancedtsextendingyourtsconfigs&quot;&gt;Advanced TS: Extending your TS configs&lt;/h2&gt;
&lt;blockquote&gt;
&lt;p&gt;TODO: Finish this using NX as the example&lt;/p&gt;
&lt;/blockquote&gt;
&lt;h2 id&#x3D;&quot;commontserrorsandhowtosolvethem&quot;&gt;Common TS Errors and how to solve them&lt;/h2&gt;
&lt;br&gt;
&lt;h4 id&#x3D;&quot;ts2304notypingsforxlibrary&quot;&gt;TS2304: No Typings for X Library&lt;/h4&gt;
&lt;p&gt;Common situation with this is jQuery and a plugin library for it like SemanticUI.&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;Could not find a declaration file for module &#x27;moduleName&#x27;. &#x27;/path/to/moduleName/lib/api.js&#x27; implicitly has an &#x27;any&#x27; type.
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;OR&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;TS2304 - Cannot find name &#x27;$&#x27;
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;OR&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;TS2307 Cannot find module &#x27;Z&#x27;
&lt;/code&gt;&lt;/pre&gt;
&lt;h5 id&#x3D;&quot;whydoyougettheerror&quot;&gt;Why do you get the error?&lt;/h5&gt;
&lt;p&gt;So why do you get this error? The reason is that Typescript can&#x27;t find any type definitions associated with that jQuery by default.&lt;/p&gt;
&lt;p&gt;Let&#x27;s take that a step further though and explore a little deeper. When we import jQuery, it doesn&#x27;t come with any typings since it&#x27;s not written in TS. So essentially, it&#x27;s not really an error. This is just TS&#x27;s way of saying &amp;quot;Hey, I don&#x27;t know what this is!&amp;quot;. So that&#x27;s nice and all but how do we correct this so we can get our code to compile and stop yelling at us?&lt;/p&gt;
&lt;h5 id&#x3D;&quot;firstglancesolutiondeclarethetypeyourself&quot;&gt;First Glance solution: Declare the type yourself.&lt;/h5&gt;
&lt;p&gt;So there are a few ways to crack this nut. The first one is this, if you only need the library in question in a few places, you can just declare the data type at the top of your class or file you&#x27;re working with like so:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;//... more code above

declare var $:any;

ngAfterViewInit(){
   $(&#x27;.someCoolElement&#x27;).goesBam();
}
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;This let&#x27;s TS know not worry about &lt;em&gt;$&lt;/em&gt; he&#x27;s legit. This solution will get you by but it&#x27;s not ideal. I say that because if you have code in multiple places that relies on this typing, then you will have to write that over and over again all over your app. Ain&#x27;t nobody got time fo that! Also, if you have a third party jQuery plugin you&#x27;re using like bootstrap or semanticUI then this will essentially break it&#x27;s type definitions since you just redeclared the type for jQuery.&lt;/p&gt;
&lt;h5 id&#x3D;&quot;betterapproachinstallsometypings&quot;&gt;Better approach: install some typings&lt;/h5&gt;
&lt;p&gt;So a more ideal way to go about solving this is just to teach TS what &lt;strong&gt;$&lt;/strong&gt; is. Teach it to recognize jQuery and what API to expect from it. The way you do this is to install the typings. You can see more about this above where we described the tsconfig compiler options and types. Once you install the types, just restart your the ng cli or comipler. Boom, now you can eliminate all of those nasty inline declare statements in your .ts files and everybody plays nice together.&lt;/p&gt;
&lt;p&gt;There used to be typings managers like one creatively called &lt;em&gt;typings&lt;/em&gt; or another popular manager called &lt;em&gt;TSD&lt;/em&gt;. These still can be used but TS&#x27;s official way of handling typings &lt;a href&#x3D;&quot;https://www.google.com/url?sa&#x3D;t&amp;amp;rct&#x3D;j&amp;amp;q&#x3D;&amp;amp;esrc&#x3D;s&amp;amp;source&#x3D;web&amp;amp;cd&#x3D;2&amp;amp;cad&#x3D;rja&amp;amp;uact&#x3D;8&amp;amp;ved&#x3D;0ahUKEwicx734qaDSAhWJ14MKHdVoDZ4QFggiMAE&amp;amp;url&#x3D;https%3A%2F%2Fblogs.msdn.microsoft.com%2Ftypescript%2F2016%2F06%2F15%2Fthe-future-of-declaration-files%2F&amp;amp;usg&#x3D;AFQjCNFRREanj1V7mftRp_tB0yz0gKGCGQ&amp;amp;sig2&#x3D;0uLv5xNr5pqVACV5olw37A&quot;&gt;now is via NPM&lt;/a&gt;.&lt;/p&gt;
&lt;h4 id&#x3D;&quot;2ts2687conflictingtypedefinitionsalldeclarationsofobservablemusthaveidenticalmodifiers&quot;&gt;2) TS2687: Conflicting Type Definitions:  All declarations of &#x27;observable&#x27; must have identical modifiers&lt;/h4&gt;
&lt;p&gt;This happens when a library has it&#x27;s 1 definition type but another library exports it&#x27;s own type. I recently ran into this one when RXJS updated it&#x27;s definition of Observable but zen-observable wasn&#x27;t up to date with the latest definition.&lt;/p&gt;
&lt;p&gt;How do you fix this? You google and play with your package.json version numbers until you are driven to drink :)&lt;br&gt;
In all seriousness, often you must downgrade one package until the maintainer of package a updates its type definitions to be compatible with the type defs of package b.&lt;/p&gt;
&lt;/div&gt;
	</div>
</div>

