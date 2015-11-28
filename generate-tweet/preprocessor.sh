#!/usr/bin/env bash
## These are string transforms on the tweet that should be
## done before tokenization.

#remove http urls (will get mangled if after & replacements)
#remove twitter media urls
#remove beg and end quotes, replace escaped quotes
#replace newline with space, replace curly-quotes
#en and em-dash with -, squeeze dashes
#replace 2+ periods with ellipses
#remove '(cont)'
#remove any double-quotes
#remove opening '.'
#replace A.M. with am (case-insensitive)
#replace P.M. with pm (case-insensitive)
#replace ' &word' as '& word'
#replace 'punct&word' as 'punct & word'
#replace 'word&' as 'word &'
#replace shorthand '&' with 'and'
#squeeze spaces
#replace 'xx.xx' as 'xx . xx' (do after url removal)
#remove this weird -quoted text- - Name thing (caused by upper managling)
#remove (non)quoted mentions: "@Username: ...
#remove opening self mentions to @realDonaldTrump
#chomp whitespace
cat "${1:-/dev/stdin}" | \
	sed -E 's/https?:\/\/[^[:space:]]+//g' | \
	sed -E 's/pic\.twitter\.com[^[:space:]]+//g' | \
  sed -e 's/^"//g' -e 's/"$//g' -e 's/\\"/"/g' \
      -e 's/\\n/ /g' -e "s/[‘’]/'/g" -e 's/[“”]/-/g' \
      -e 's/[–—~]/-/g' | tr -s '-' | \
  sed -E 's/\.{2,}/…/g' | \
	sed -E 's/\([:space:]?cont[:space:]?\)//g' | \
	sed -e 's/"//g' \
			-e 's/^[[:space:]]*\.//g' \
			-e 's/[Aa]\.[Mm]\./am/g' \
			-e 's/[Pp]\.[Mm]\./pm/g' \
			-e 's/[[:space:]]\(\&\)\([^\s]\)/ \1 \2/g' \
			-e 's/[\.,;!?]\(\&\)\([^\s]\)/ \1 \2/g' \
			-e 's/\([^\s]*\)\(&\)[[:space:]]/\1 \2 /g' \
			-e 's/[[:space:]]&[[:space:]]/ and /g' | \
  tr -s [:space:] | \
	sed -E 's/([^\s\.]{2,})\.([^\s\.]{2,})/\1 . \2/g' | \
  sed -e 's/^-//g' -e 's/- -/-/g'| \
	sed -E 's/^["\.]?\.?@.*: +//g' | \
	sed	-E 's/\.?@realDonaldTrump +//g' | \
	sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
