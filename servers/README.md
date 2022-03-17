The Dendrite server is a subtree from the upstream of https://github.com/matrix-org/dendrite.git

It was intially populated with:

    git remote add dendrite https://github.com/matrix-org/dendrite.git
    git fetch dendrite
    git subtree add --prefix=servers/dendrite dendrite main

Pulling changes from upstream

    git fetch dendrite
    git subtree pull --prefix=servers/dendrite dendrite main --squash

    This command will pull the changes since the last time it ran and create a merge commit on top. Keep in mind that the pulled commits might be older than the latest commit of your code though, so they might not appear directly when you call git log.

Pulling changes to upstream

     There is a fork of https://github.com/matrix-org/dendrite.git at https://github.com/HereNotThere/dendrite.git. This fork is registerd as a remote named dendrite-fork. To push changes upstream we first push them to this fork, reconcile any changes, and then create a PR to Dendrite from this foork.

     The for was created with this command

         git remote add dendrite-fork https://github.com/HereNotThere/dendrite.git

    To push to the fork, use this command

        git subtree push --prefix=servers/dendrite dendrite-fork main

Further reading about maintaininf the subtree may be found here:

https://www.atlassian.com/git/tutorials/git-subtree
