
<div class="post">
	<h1>Intro To Calibre</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;This is a quick intro to the popluar ebook managing software &lt;a href&#x3D;&quot;https://manual.calibre-ebook.com/&quot;&gt;Calibre&lt;/a&gt;. Calibre is automated with the thraxis/calibre docker container as part of our media setup. It uses lazylibrarian to fetch books and calibre-web to enable browsing them. All manual work with calibre is done via the cli. Examples of how to work with it are below.&lt;/p&gt;
&lt;h3 id&#x3D;&quot;definitions&quot;&gt;Definitions&lt;/h3&gt;
&lt;ul&gt;
&lt;li&gt;&lt;strong&gt;Virtual Library&lt;/strong&gt; is a way to tell Calibre to work with only a subset of a normal library. You can use this to show content from a certain author or perhaps content that only has a certain tag.&lt;/li&gt;
&lt;/ul&gt;
&lt;h3 id&#x3D;&quot;seealistofbooksinthecalibredatabase&quot;&gt;See a list of books in the calibre database&lt;/h3&gt;
&lt;p&gt;&lt;code&gt;calibredb list --with-library /config/books/&lt;/code&gt;&lt;/p&gt;
&lt;h3 id&#x3D;&quot;manuallyimportingabookusingcalibredb&quot;&gt;Manually importing a book using calibredb&lt;/h3&gt;
&lt;p&gt;&lt;code&gt;calibredb add --with-library /config/books/ book1 book2&lt;/code&gt;&lt;/p&gt;
&lt;p&gt;to add with identifiers:&lt;br&gt;
&lt;code&gt;calibredb add --with-library /config/books/ -i isbn:1290 book1 book2&lt;/code&gt;&lt;/p&gt;
&lt;p&gt;Where &lt;em&gt;isbn&lt;/em&gt; is the identifier.&lt;/p&gt;
&lt;h3 id&#x3D;&quot;removingabookfromthedb&quot;&gt;Removing a book from the db&lt;/h3&gt;
&lt;p&gt;&lt;code&gt;calibredb remove ids&lt;/code&gt;&lt;/p&gt;
&lt;p&gt;where &lt;em&gt;ids&lt;/em&gt; is a comma seperated list of ids that match from the &lt;code&gt;calibre list&lt;/code&gt; command.&lt;/p&gt;
&lt;h3 id&#x3D;&quot;seeallofthetagsinthelibrary&quot;&gt;See all of the tags in the library&lt;/h3&gt;
&lt;p&gt;&lt;code&gt;calibredb list_categories --with-library /config/books/&lt;/code&gt;&lt;/p&gt;
&lt;h3 id&#x3D;&quot;searchingforthings&quot;&gt;Searching for things&lt;/h3&gt;
&lt;p&gt;Calibre has a search query language that returns a list of ids matching your search. This allows you to pipe the value of the search command to other commands.&lt;br&gt;
&lt;code&gt;calibredb search --with-library /config/books/ title:javascript&lt;/code&gt;&lt;/p&gt;
&lt;h3 id&#x3D;&quot;hidingparticulartypesofmediafromrecentlyadded&quot;&gt;Hiding particular types of media from recently added&lt;/h3&gt;
&lt;/div&gt;
	</div>
</div>

