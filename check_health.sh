#!/bin/bash
OUTPUTFOLDER=${TMP_DIR:-/tmp/cwa-book-downloader}
mkdir -p $TMP_DIR

OUTPUTFOLDER=${INGEST_DIR:-/cwa-book-ingest}
mkdir -p $OUTPUTFOLDER

# Get a list of files to process

# Check if a file was supplied through command line arguments
if [ "$#" -gt 0 ]; then
    files=("$@")
else
    files=($TMP_DIR*)
fi

# Total number of files
total_files=${#files[@]}


good=0
bad=0
manual=0


# Process files in the 'downloads' directory
for file in "${files[@]}"; do

    # Skip if it's not a regular file
    [ -f "$file" ] || continue

    # Extract filename and extension
    filenamewithext="${file##*/}"
    filename="${filenamewithext%.*}"
    fileextension="${filenamewithext##*.}"

    case "$fileextension" in
        epub)
            # Check if the EPUB file is a valid archive
            7z t "$file" >/dev/null 2>&1;
            exit_code=$?
            if [ "$exit_code" -eq 0 ] || [ "$exit_code" -eq 1 ]; then
                mv "$file" "$OUTPUTFOLDER/$filenamewithext"
                good=$((good + 1))
            else
                ebook-convert "$file" /tmp/tmpepub.epub >/dev/null 2>&1
                exit_code=$?
                rm -f /tmp/tmpepub.epub 
                if [ "$exit_code" -eq 0 ]; then
                    mv "$file" "$OUTPUTFOLDER/$filenamewithext"
                    good=$((good + 1))
                else
                    rm "$file"
                    bad=$((bad + 1))
                fi
            fi
            ;;
        mobi|azw3|fb2|djvu|cbz|cbr)
            # Attempt to convert the file to EPUB
            ebook-convert "$file" "$OUTPUTFOLDER/$filename.epub" >/dev/null 2>&1
            if [ "$exit_code" -eq 0 ]; then
                good=$((good + 1))
            else
                bad=$((bad + 1))
            fi
            rm "$file"
            ;;
        *)
            # Move other files to the 'other' directory
            rm  "$file"
            bad=$((manual + 1))
            ;;
    esac
done

# Move to a new line after the progress bar completes
echo

echo "Out of $total_files, $good are good, $bad are corrupt and $manual need manual inspection"

if [ "$bad" -gt 0 ]; then
    exit 2
fi
if [ "$manual" -gt 0 ]; then
    exut 1
fi
exit 0
