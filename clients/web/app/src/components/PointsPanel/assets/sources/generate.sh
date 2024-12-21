tmp=../tmp
output=../

echo "cleaning up..."
rm -rf $tmp
mkdir $tmp

echo "files..."
for dir in ./*/     # list directories in the form "/tmp/dirname/"
do
    dir=${dir%*/}      # remove the trailing "/"
    [[ "${dir##*/}" == "coin"* ]] && continue  # skip dirs containing underscore
    echo "processing ${dir##*/}"    # print everything after the final "/"

    i=0; for f in $dir/*.png; 
        do cp "$f" "${tmp}/${dir}_$(printf '%03d' $i).${f##*.}"; ((i++)); 
    done

    magick mogrify  -resize 125x125 -quality 100 -path $tmp $tmp/*.png
done

echo "generating spritesheet..."
spritesheet-js --name sprites-combined --path $output --scale=0 $tmp/*.png 

# echo "compressing spritesheet..."
magick $output/sprites-combined.png -colors 128 $output/sprites-combined_64.png


echo "generating custom spritesheets..."
spritesheet-js coin/*.png --name sprites-coin --path $output --scale 100

