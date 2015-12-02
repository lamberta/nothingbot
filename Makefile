TWEETS_GZ = ./corpus/tweets/realDonaldTrump-670431647603425281.csv.gz
TWEETS_TXT = ./corpus/tweets/realDonaldTrump.txt
SARTRE_TXT = ./corpus/sartre-being-and-nothingness.txt
TWEET_PREPROCESSOR = ./generate-tweet/preprocessor.sh

#bug in osx zcat
PLATFORM = $(shell uname -s)
ifeq ($(PLATFORM),Linux)
	ZCAT = zcat
endif
ifeq ($(PLATFORM),Darwin)
	ZCAT = gzcat
endif

.PHONY: install clean

#install node and python packages
install:
	npm install
	pip install --user -r requirements.txt
	python -m nltk.downloader punkt
	$(ZCAT) $(TWEETS_GZ) | cut -f3- -d',' | $(TWEET_PREPROCESSOR) > $(TWEETS_TXT)
	gunzip -c $(SARTRE_TXT).gz > $(SARTRE_TXT)

clean:
	rm $(TWEETS_TXT)
