#!/usr/bin/env zsh

##
## If visual studio crashes after running ~start local dev~ 
## it will leave lots of things running in the background
## this script will kill all the processes that are running on your local machine.
##


function do_killl() {
    echo ""
    echo "finding processes containing $1"
    echo ""
    param="$1"
    first="${param:0:1}"
    rest="${param:1}"
    term="[${first}]${rest}"
    if [[ $(ps -ax | grep "$term") ]]
    then
        ps -ax | grep "$term"
        echo ""
        read b_continue'?Kill these processes?:y/n '
        if [[ "$b_continue" == "y" ]]
        then
            kill $(ps -ax | grep "$term" | awk '{print $1}')
        fi
    else
        echo "no results found"
    fi
}


do_killl dendrite
do_killl yarn
do_killl anvil
do_killl wrangler
