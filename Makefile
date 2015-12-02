TWEETS_GZ = ./corpus/tweets/realDonaldTrump-670431647603425281.csv.gz
TWEETS_TXT = ./corpus/tweets/realDonaldTrump.txt
SARTRE_GZ = ./corpus/sartre-being-and-nothingness.txt.gz
TWEET_PREPROCESSOR = ./generate-tweet/preprocessor.sh

.PHONY: install corpus clean

#install node and python packages
install:
	npm install
	pip install --user -r requirements.txt
	gzcat $(TWEETS_GZ) | cut -f3- -d',' | $(TWEET_PREPROCESSOR) > $(TWEETS_TXT)
	gunzip $(SARTRE_GZ)

clean:
	rm $(TWEETS_TXT)
