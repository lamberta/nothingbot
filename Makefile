TWEETS_CSV = ./corpus/tweets/realDonaldTrump-670431647603425281.csv.gz
TWEETS_TXT = ./corpus/tweets/realDonaldTrump.txt
TWEET_PREPROCESSOR = ./generate-tweet/preprocessor.sh

.PHONY: install corpus clean

#install node and python packages
install:
	npm install
	pip install -r requirements.txt

#tweets stored as json string, remove escapes and other things
corpus:
	gzcat $(TWEETS_CSV) | cut -f3- -d',' | $(TWEET_PREPROCESSOR) > $(TWEETS_TXT)

clean:
	rm $(TWEETS_TXT)
