
<div class="post">
	<h1>Github Collaboration Basics</h1>
	<div class="post-content">
		&lt;div class&#x3D;&quot;kg-card-markdown&quot;&gt;&lt;p&gt;In this article we will focus on some basic concepts that take you beyond merley backing up your own code, to how to work within a group and collaborate. We will be doing this in the context of github since it&#x27;s the defacto.&lt;/p&gt;
&lt;p&gt;Typically when you work solo in git, you setup where you are sending your code to when you want to back it up. This is called the &lt;em&gt;remote&lt;/em&gt;. In order to back your code up, you send it &lt;em&gt;upstream&lt;/em&gt;. This is where you cloned the code from, generally speaking. Downstream then is any repo that integrates the upstream code.&lt;/p&gt;
&lt;p&gt;When working on a team, or contributing to a project you like, rather than cloning the authors code and working directly on their source, you can create what&#x27;s called a &lt;strong&gt;fork&lt;/strong&gt;. A fork is just a copy of the repo. So if a fork is a copy and a clone is a copy what&#x27;s the difference?&lt;/p&gt;
&lt;h2 id&#x3D;&quot;forkvsclone&quot;&gt;Fork vs. Clone.&lt;/h2&gt;
&lt;p&gt;In essence these are sides of the same coin. The difference comes down to one thing, access. When you clone a repo you can&#x27;t push your code up unless you&#x27;ve been given access by someone. Forking is essetially cloning the repo onto your github account and in essence created a whole new repo. After you&#x27;re done you can submit a pull request to have your code merged back into the original repository.&lt;/p&gt;
&lt;h5 id&#x3D;&quot;keepingtheforkinsync&quot;&gt;Keeping the fork in sync&lt;/h5&gt;
&lt;p&gt;A copy is nice and all, but anything that is more than a basic fix will require you to keep your code in sync with the original. You can do this by adding an upstream remote that points to the original. This is done with:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;git remote add upstream https://github.com/ORIGINAL_OWNER/ORIGINAL_REPOSITORY.git
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;After that you can sync your code with a few commands.&lt;/p&gt;
&lt;ul&gt;
&lt;li&gt;&lt;code&gt;git fetch upstream&lt;/code&gt;: Pulls the latest branch and tracking info from the remote.&lt;/li&gt;
&lt;li&gt;&lt;code&gt;git checkout master&lt;/code&gt;: Switch to your local version of the master branch.&lt;/li&gt;
&lt;li&gt;&lt;code&gt;git merge upstream/master&lt;/code&gt;: This merges the upstream version of master with your local master, syncing you to the latest changes.&lt;/li&gt;
&lt;/ul&gt;
&lt;p&gt;When you pull upstream git stores the changes from the upstream repository in the upstream/master branch.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;thepullrequestsubmittingyourfixtotheoriginalrepo&quot;&gt;The pull request - submitting your fix to the original repo&lt;/h2&gt;
&lt;p&gt;Now that you have made your fix or implemented your features it&#x27;s time to give your work back to the author. When collaberating in a team, code is usually peer reviewed before being pushed to the master branch. In the case of git flow, submitting a pull request for a feature branch will highlight all the changes made in the branch and allow the peer reviewer to make comments visable to all collaborators. You may continue to push commits to the branch even after the pull request was sent and your changes will be shown. Once the code is peer reviewed and accepted you can then merge the branch into master or develop if you&#x27;re using git flow.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;takingitupalevelgitsubmodules&quot;&gt;Taking it up a level: Git Submodules&lt;/h2&gt;
&lt;p&gt;A submodule is basically a git repo within another git repo. That means when you update your main repo supmodules will not be changed and you can clone these submodules into other repositories allowing you to easily share that component across multiple repositories.&lt;/p&gt;
&lt;p&gt;If you use Nx Workspaces, or anything similar, or have ever made edits to a 3rd party library for use in your app and haven&#x27;t heard of sub modules then you&#x27;re in for a treat. When you add a submodule in Git you&#x27;re not actually adding the code to the repo but rather some information that points to which commit that submodule should be pointing to. This is what allows you to run a &lt;code&gt;git pull&lt;/code&gt; command and pull the latest changes in the main repo without pulling any changes made to the submodule, if any.&lt;/p&gt;
&lt;h4 id&#x3D;&quot;addingasubmodule&quot;&gt;Adding a submodule&lt;/h4&gt;
&lt;p&gt;To add a submodule do:&lt;/p&gt;
&lt;pre&gt;&lt;code&gt;git submodule add git@github.com:url_to/awesome_submodule.git path_to_awesome_submodule
&lt;/code&gt;&lt;/pre&gt;
&lt;p&gt;After a &lt;code&gt;git status&lt;/code&gt; you will notice a &lt;code&gt;.gitmodules&lt;/code&gt; file and the folder where you put your submodule. Any collaberators will need to do a &lt;code&gt;git pull&lt;/code&gt; followed by a &lt;code&gt;git submodule init&lt;/code&gt; to get the submodule.&lt;/p&gt;
&lt;h4 id&#x3D;&quot;makingchangestosubmodulesandsyncingcode&quot;&gt;Making Changes to submodules and syncing code.&lt;/h4&gt;
&lt;p&gt;When you make changes to a submodule you push it up just like normal. In order to get the refrence to the submodule in the main repo up to date you&#x27;ll have to repeat the process.&lt;/p&gt;
&lt;p&gt;If you do a &lt;code&gt;git status&lt;/code&gt; you&#x27;ll see the changes to the submodule Listed under &lt;code&gt;Changes not staged for commit&lt;/code&gt;. This means that your main repo is pointing to an older commit and needs to be updated. If someone else updates a submodue you can pull the changes down with a &lt;code&gt;git submodule update&lt;/code&gt;.&lt;/p&gt;
&lt;p&gt;If you want you can make an alias to update submodule while pulling new code with &lt;code&gt;git config --global alias.update &#x27;!git pull &amp;amp;&amp;amp; git submodule update --init --recursive&#x27;&lt;/code&gt;.&lt;/p&gt;
&lt;p&gt;Note that the submodule update command will only update the submodules to the latest commit specified in the main repo.&lt;/p&gt;
&lt;blockquote&gt;
&lt;p&gt;Note that the submodule update command will only update the submodules to the latest commit specified in the main repo.&lt;/p&gt;
&lt;/blockquote&gt;
&lt;p&gt;What that means is that if the main repo isn&#x27;t updated to the latest commit via the method listed above it will not be aware of any commits made on the submodules own remote. You can use the &lt;code&gt;--remote&lt;/code&gt; flag when running the update command to circumvent this.&lt;/p&gt;
&lt;h2 id&#x3D;&quot;monovsmultirepos&quot;&gt;Mono vs Multi Repos&lt;/h2&gt;
&lt;p&gt;Put simply a mono repo is one repo. Having a mono repo for a project or a group of related projects or even all of your projects entirely is commonly used for a number of reasons.&lt;/p&gt;
&lt;h5 id&#x3D;&quot;moreorganized&quot;&gt;More Organized&lt;/h5&gt;
&lt;p&gt;Having a mono repo keeps things more organized and easy to navigate. You can group projects that are similar in nature or communicate with each other in some way and have easy access to multipl projects from one area.&lt;/p&gt;
&lt;h5 id&#x3D;&quot;simplerdependecymanagement&quot;&gt;Simpler Dependecy Management&lt;/h5&gt;
&lt;p&gt;This probably goes without saying, but with multiple repos, you need to have some way of specifying and versioning dependencies between them. That sounds like it ought to be straightforward, but in practice, most solutions are cumbersome and involve a lot of overhead. With a monorepo, it&#x27;s easy to have one universal version number for all projects.&lt;/p&gt;
&lt;h5 id&#x3D;&quot;tooling&quot;&gt;Tooling&lt;/h5&gt;
&lt;p&gt;The simplification of navigation and dependencies makes it much easier to write tools. Instead of having tools that must understand relationships between repositories, as well as the nature of files within repositories, tools basically just need to be able to read files (including some file format that specifies dependencies between units within the repo).&lt;/p&gt;
&lt;h3 id&#x3D;&quot;refrences&quot;&gt;Refrences&lt;/h3&gt;
&lt;ul&gt;
&lt;li&gt;&lt;a href&#x3D;&quot;https://help.github.com/articles/merging-a-pull-request/&quot;&gt;https://help.github.com/articles/merging-a-pull-request/&lt;/a&gt;&lt;/li&gt;
&lt;li&gt;&lt;a href&#x3D;&quot;https://yangsu.github.io/pull-request-tutorial/&quot;&gt;https://yangsu.github.io/pull-request-tutorial/&lt;/a&gt;&lt;/li&gt;
&lt;li&gt;&lt;a href&#x3D;&quot;https://help.github.com/articles/fork-a-repo/&quot;&gt;https://help.github.com/articles/fork-a-repo/&lt;/a&gt;&lt;/li&gt;
&lt;li&gt;&lt;a href&#x3D;&quot;https://stackoverflow.com/questions/6286571/are-git-forks-actually-git-clones&quot;&gt;https://stackoverflow.com/questions/6286571/are-git-forks-actually-git-clones&lt;/a&gt;&lt;/li&gt;
&lt;li&gt;&lt;a href&#x3D;&quot;https://gist.github.com/gitaarik/8735255&quot;&gt;https://gist.github.com/gitaarik/8735255&lt;/a&gt;&lt;/li&gt;
&lt;li&gt;&lt;a href&#x3D;&quot;https://stackoverflow.com/questions/5828324/update-git-submodule-to-latest-commit-on-origin/5828396#5828396&quot;&gt;https://stackoverflow.com/questions/5828324/update-git-submodule-to-latest-commit-on-origin/5828396#5828396&lt;/a&gt;&lt;/li&gt;
&lt;/ul&gt;
&lt;/div&gt;
	</div>
</div>

