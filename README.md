# Code Examples for using Twitter API v2

## Extract Transform and Load

Follow this [tutorial](https://developer.twitter.com/...)

(TODO: @duckranger add details)
1. Clone this repository
1. Run `npm install` in the repo's directory
1. Obtain a json key file for Google API (See https://www.fastcomet.com/tutorials/nodejs/google-spreadsheet-package) and place it inside the config directory
1. Obtain a Twitter access token 
1. Create a Google Spreadsheet and get its id (The last part of the url: https://docs.google.com/spreadsheets/d/xxxxxxx)
1. Make sure to share the sheet with `client_email` from within the Google json key file
1. `npm start`


### Environment Variables
The code relies on the following variables to be available, e.g. by using an `.env` file.
```
TW_BEARER_TOKEN=<A Twitter API v2 bearer token>
TW_TERM=<A search term>
TW_HASHTAG=<A tag (without the # sign)>
TW_GOOGLE_DOC_ID=<The Google Sheet id to use>
```
It also requires the Google json keyfile to be stored in `/config/client_secret.json`