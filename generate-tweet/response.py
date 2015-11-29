# -*- coding: utf-8 -*-
from __future__ import print_function
from collections import OrderedDict
from nltk.tokenize import sent_tokenize
import sys
import re
import random
import markov

TWITTER_LEN = 140

TOKEN_SUBS = OrderedDict([
    (u'\u2026', '...') #ellipses
])

STRING_SUBS = OrderedDict([
    (r' is is ', r' is '),
    (r' to to ', r' to '),
    (r' the the ', r' the '),
    (r'[Uu]\. [Ss]\.', r'U.S.'),
    (r" ' [Ss]( ?|\.|\.!\?|$)", r"'s "), #'s
    (r"^' [Ss] ", r''),                  #opening 's
    (r"[Ss] ' ","s' "),                  #s'
    (r" ' (.*) '( ?|$)", r" '\1' "),     #shrink single-quotes around phrase
    (r" - (.*) -( ?|$)", r" -\1- "),     #shrink single-dash around phrase
    (r' \( (.*) \)', r' (\1)'),          #shrink parens around phrase
    (r"(^[^']*) ' ([^']*$)", r'\1 \2'),  #remove a single errant ' in middle
    (r'\s+-\s*$', r''),                  #don't end with a space-dash
    (r" w / ", r" w/ "),                 #squeeze 'w/'
    (r'\,{2,}', r','),                   #squeeze ,
    (r'( \$) (\d)', r'\1\2'),            #move $ right
    (r'(\d{1,},) (\d{2,})', r'\1\2'),    #squeeze large number with comma
    (r'(\d) % ', r'\1% '),               #squeeze percent 'n % ' to 'n% '
    (r' :{2,}', r':'),                   #squeeze space-colons
    (r'\$ \$ \$', r'$$$'),               #speeze 3 $'s together
    (r' ([\.?!,;:])$', r'\1')            #squeeze space and final punct
])

SHORTEN_1_SUBS = OrderedDict([
    (r' \.\.\. ', r'...'),
    (r' - ', r'-'),
    (r' [Tt]o ', r' 2 '),
    (r' [Aa]nd ', r' & '),
    (r' [Aa]re ', r' R '),
    (r'[Bb]ecause', r'b/c'),
    (r'[Bb]efore', r'b4'),
    (r' Celebrity', r' Celeb'),
    (r' celebrity', r' celeb'),
    (r'check', r'chk'),
    (r'click', r'clk'),
    (r'could', r'cld'),
    (r'[Ff]avorite', r'fav'),
    (r'[Ff]orever', r'4ever'),
    (r' [Ff][Oo][Rr] ', r' 4 '),
    (r" it's ", r' its '),
    (r" it is ", r' its '),
    (r' [Oo][Uu[Rr] ', r' R '),
    (r"[Rr]ussia ", r'Rus '),
    (r"U\.S\.", r'US'),
    (r'[Vv]ideo', r'vid'),
    (r'[Rr]e-?[Tt]weet', r'RT'),
    (r'[Tt]hank [Yy]ou', r'TY'),
    (r'[Tt]hanks', r'thx'),
    (r'[Jj]anuary', r'Jan'),
    (r'[Fb]ebruary', r'Feb'),
    (r'[Mm]arch', r'Mar'),
    (r'[Aa]pril', r'Apr'),
    (r'[Jj]une', r'Jun'),
    (r'[Jj]uly', r'Jul'),
    (r'[Aa]ugust', r'Aug'),
    (r'[Ss]eptember', r'Sep'),
    (r'[Oo]ctober', r'Oct'),
    (r'[Nn]ovemberr', r'Nov'),
    (r'[Dd]ecember', r'Dec'),
    (r'[Mm]onday', r'Mon'),
    (r'[Tt]uesday', r'Tue'),
    (r'[Ww]ednesday', r'Wed'),
    (r'[Tt]hursday', r'Thu'),
    (r'[Ff]riday', r'Fri'),
    (r'[Ss]aturday', r'Sat'),
    (r'[Ss]unday', r'')
])

SHORTEN_2_SUBS = OrderedDict([
    (r'[Aa]bout', r'abt'),
    (r' [Oo]ne ', r' 1 '),
    (r' [Pp]eople ', r' ppl '),
    (r' [Yy]ou ', r' U '),
    (r'\!\!\!', r'!'),
    (r'\?\?\?', r'?'),
    (r'\, ', r','),
    (r'\. ', r'.'),
    (r'\.\.\.', r'..'),
    (r'[Pp]resident', r'Prez'),
    (r'[Tt]omorrow', r'tom'),
    (r'[Tt]onight', r'2nite'),
    (r'[Tt]onite', r'2nite')
])


def format_tweet (tokens):
    """Rules to join tokens into a single response string"""
    if len(tokens) == 0:
        print("Warning: empty token list, skipping", file=sys.stderr)
        return None
    ## LOG
    #print("\033[90m==>" + str(tokens) + '\033[0m', file=sys.stderr)
    res = ''
    for i, token in enumerate(tokens):
        if token in TOKEN_SUBS: token = TOKEN_SUBS.get(token)
        #no space before first token or punctuation
        if i == 0 or token in (',', '.', '?', '!', ':', ';'):
            res += token
        else:
            res += (' ' + token)
    ## LOG
    #print("\033[90m==>" + res + '\033[0m', file=sys.stderr)
    for pattern, replace in STRING_SUBS.iteritems():
        res = re.sub(pattern, replace, res)
    res = res.strip() #surrounding whitespace
    #if starts with a mention, make all replies public (for now)
    if res[0] == '@':
        res = ('.' + res)
    else:
        #otherwise, make sure the first letter is capitalized
        res = (res[0].capitalize() + res[1:])
    return res


def shorten_tweet (string):
    if len(string) <= TWITTER_LEN:
        return string
    #phase 1: simple subs
    string1 = string
    for pattern, replace in SHORTEN_1_SUBS.iteritems():
        string1 = re.sub(pattern, replace, string1)
    string1 = string1.strip()
    string1 = re.sub('[\s\.,;:-_]+$', r'', string1) #extra trailing chars
    if len(string1) <= TWITTER_LEN:
        return string1
    #phase 2: aggressive subs
    string2 = string1
    for pattern, replace in SHORTEN_2_SUBS.iteritems():
        string2 = re.sub(pattern, replace, string2)
    string2 = string2.strip()
    if len(string2) <= TWITTER_LEN:
        return string2
    #phase 3: break sentences
    sentences = sent_tokenize(string)
    if len(sentences) > 1:
        sentences.sort(key=len) #short to long
        return shorten_tweet(sentences[-1]) #take longest, try again
    else:
        #must be one really long run-on sentence
        return None


def list_middle (lst, count=1, offset=0):
    l = len(lst)
    if count > l:
        raise IndexError("Count too high")
    start = int((l - count) / 2)
    start += offset
    if start < 0 or start + count > l:
        raise IndexError("Offset out of bounds")
    return lst[start : start+count]


def build_tweets (token_lists, count=1, ngram=3):
    all_responses = []
    #generate twice as many as we need, min 10, take the longest of the bunch
    gen_count = count*2
    if gen_count < 10: gen_count = 10
    markov_tokens = markov.generate_from_token_lists(token_lists, ngram, gen_count)
    for tokens in markov_tokens:
        res = format_tweet(tokens)
        if res is not None:
            res = shorten_tweet(res)
            if res is not None:
                all_responses.append(res)
    all_responses.sort(key=len) #short to long
    all_responses.reverse()     #long to short
    #select middle section of list and randomize
    responses = list_middle(all_responses, count)
    random.shuffle(responses)
    return responses
