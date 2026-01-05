
<div class="post">
	<h1>GraphQL Basics</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;GraphQL is an abstraction layer for your API&#x27;s. You can think of it as an ORM for your endpoints. As mongoose is to Mongo, GraphQL is to rest API&#x27;s.&lt;/p&gt;
&lt;h4 id&#x3D;&quot;theanatomyofagraphqlquery&quot;&gt;The anatomy of a GraphQL query&lt;/h4&gt;
&lt;p&gt;Let&#x27;s take an example directly from GraphQL&#x27;s site and disect it.&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;{
  hero {
    name
    appearsIn
  }
}
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;There are a few fundamental parts to every GraphQL query.&lt;/p&gt;
&lt;ol&gt;
&lt;li&gt;The outermost brackets are what&#x27;s known as the root query.&lt;/li&gt;
&lt;li&gt;In the root query we&#x27;re selecting &lt;em&gt;fields&lt;/em&gt;. Fields are what become properties in the returned selection.&lt;/li&gt;
&lt;li&gt;Everything between the curly braces is known as a selection set.&lt;/li&gt;
&lt;/ol&gt;
&lt;h4 id&#x3D;&quot;itlookscoolbutwhatsgraphqlfor&quot;&gt;It looks cool but what&#x27;s GraphQL for?&lt;/h4&gt;
&lt;p&gt;GraphQL not only gives you a delcarative way to ask for your data, but it also handles type checking, caching, and managing your endpoints. In addition to these features, one important distinction about GraphQL is it inverts the control of how data is requested and returned. We&#x27;ll dive into each of these points more in detail as the post progresses.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;graphqltypes&quot;&gt;GraphQL Types&lt;/h2&gt;
&lt;p&gt;Let&#x27;s base our learning off of a fictional class room assesment app. When you ask for data GQL has to know what a exam is. The way you do this is by defining an &lt;em&gt;Exam Type&lt;/em&gt;. Let&#x27;s look at how to do that:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;type Exam {
    _id: String!
    questions: [Question]
    pages: [Page]
    student(id: student_id): String!
}
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;We&#x27;ve talked about what this syntax means above, but the things to note here in this example are:&lt;/p&gt;
&lt;ol&gt;
&lt;li&gt;&lt;strong&gt;Exam&lt;/strong&gt;: is a GQL Object type that we&#x27;re defining.&lt;/li&gt;
&lt;li&gt;&lt;strong&gt;Page&lt;/strong&gt; and &lt;strong&gt;Question&lt;/strong&gt; are previously defined Object Types.&lt;/li&gt;
&lt;li&gt;The &lt;strong&gt;!&lt;/strong&gt; at the end of the line signifies that this is a required field.&lt;/li&gt;
&lt;li&gt;&lt;strong&gt;String&lt;/strong&gt; is a built in data type.&lt;/li&gt;
&lt;li&gt;The &lt;strong&gt;[Question]&lt;/strong&gt; syntax denotes that it will be an array of Question types.&lt;/li&gt;
&lt;li&gt;&lt;strong&gt;student&lt;/strong&gt; takes an argument that is an id.&lt;/li&gt;
&lt;/ol&gt;
&lt;/div&gt;
	</div>
</div>

