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

        if [[ "$2" == "-y" ]]
        then
            b_continue="y"
        else
            read b_continue'?Kill these processes?:y/n/f '
        fi

        if [[ "$b_continue" == "f" ]]
        then
            kill -9 $(ps -ax | grep "$term" | awk '{print $1}')
        elif [[ "$b_continue" == "y" ]]
        then
            kill $(ps -ax | grep "$term" | awk '{print $1}')
        fi
    else
        echo "no results found"
    fi
}


do_killl dendrite "$1"
do_killl yarn "$1"
do_killl anvil "$1"
do_killl wrangler "$1"
do_killl mitmweb "$1"
