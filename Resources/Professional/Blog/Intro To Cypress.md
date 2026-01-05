
<div class="post">
	<h1>Intro To Cypress</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;h2 id&#x3D;&quot;usefulcommands&quot;&gt;Useful Commands&lt;/h2&gt;
&lt;h4 id&#x3D;&quot;togoplaces&quot;&gt;To Go places&lt;/h4&gt;
&lt;p&gt;&lt;strong&gt;cy.visit(url)&lt;/strong&gt; takes you places.&lt;br&gt;
To submit a form as if you were a user,&lt;br&gt;
you just post to that place&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;cy.visit({
 url: &#x27;http://localhost:3000/cgi-bin/newsletterSignup&#x27;,
 method: &#x27;POST&#x27;,
 body: {
   name: &#x27;George P. Burdell&#x27;,
   email: &#x27;burdell@microsoft.com&#x27;
 }
})
&lt;/code&gt;&lt;/pre&gt;
&lt;blockquote&gt;
&lt;p&gt;Optionally, but reccomended, you can add &lt;code&gt;baseUrl&lt;/code&gt; to your cypress.json and then you can ommit it from each requests&lt;/p&gt;
&lt;/blockquote&gt;
&lt;p&gt;Thus &lt;code&gt;cy.visit(&#x27;http://localhost:3000/#/dashboard&#x27;)&lt;/code&gt; becomes &lt;code&gt;cy.visit(&#x27;dashboard&#x27;)&lt;/code&gt;.&lt;/p&gt;
&lt;/div&gt;
	</div>
</div>

