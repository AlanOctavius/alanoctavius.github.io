

// Set up constants

// Authorization strings
const client_id = "x6juv2f95gdvktkvae8xhw1llrat1x";
const redirect_uri = "https://alanoctavius.github.io/";

// Global authorization
let access_token;


// Dynmaic html strings
const chartHTMLStart = '<div id="tester'
const chartHTMLEnd = '" style="width:600px;height:250px;"></div>'

// Twitch api strings
const TWITCH_TOP = "games/top";
const TWITCH_STREAM = "streams?";
const TWITCH_GAME = "games?";

// How many streams per game to fetch
const NUM_STREAMS = 50;

// Convenience for function for twitch calls
function twitchCall(path, query=null) {
  let qString
  if (query !== null) {
    qString = query.toString();
  } else {
    qString = '';
  }

  return fetch("https://api.twitch.tv/helix/"+ path + qString, {
    headers: {
      "Client-ID": client_id,
      Authorization: "Bearer " + access_token,
    },
  })
}

// Compare click function
function compareNewGame() {
  var gameName = document.getElementById("gameName").value;
  console.log("Searching for " + gameName)
  var nameQuery =new URLSearchParams({
    name: gameName,
  });

  // get game id
  twitchCall(TWITCH_GAME,nameQuery)
  .then((gameresponse) => gameresponse.json())
  .then((gameresponse) => {

    if (gameresponse.data.length === 0) {
      console.log("Can not find data for search");
      document.getElementById('searchErrorId').innerText = "Error finding game, please get exact name by searching on twitch"
    } else {
      document.getElementById('searchErrorId').innerText = "";
    }

    var streamQuery = new URLSearchParams(
      {
        game_id: gameresponse.data[0].id,
        first: NUM_STREAMS,
      }
    );

    //get stream data from id
    twitchCall(TWITCH_STREAM,streamQuery)
    .then((streamData) => streamData.json())
    .then((streamData) => {
      const localGameId = streamData.data[0].game_id;
        
      // create HTML element for the game
      const HTMLstring =  chartHTMLStart + "Q" + localGameId + chartHTMLEnd;
      document.getElementById('queryGamesId').insertAdjacentHTML('afterbegin', HTMLstring);


      // gather data for chart
      const viewCount = [];
      streamData.data.forEach(element => {
        viewCount.push(element.viewer_count);
        
      });

      data = [{y: viewCount}];

      layout =  {
        title: 'Viewer fall off: ' + streamData.data[0].game_name,
      };

      
      TESTER = document.getElementById('testerQ' + localGameId);
      Plotly.newPlot( TESTER, data , layout);
    });

  });
}


// Inject authorization link

document
  .getElementById("authorize")
  .setAttribute(
    "href",
    "https://id.twitch.tv/oauth2/authorize?client_id=" +
      client_id +
      "&redirect_uri=" +
      encodeURIComponent(redirect_uri) +
      "&response_type=token"
  );

// Check if we are an authorized with twitch
if (document.location.hash && document.location.hash != "") {
  // hide authorization segment
  document.getElementById("authorized").style.display = "block";
  document.getElementById("preauthorized").style.display = "none";

  // get users access token
  var parsedHash = new URLSearchParams(window.location.hash.slice(1));
  if (parsedHash.get("access_token")) {
    access_token = parsedHash.get("access_token");
  }

  // fetch top games list
  twitchCall(TWITCH_TOP)
  .then((gameresponse) => gameresponse.json())
  .then((gameresponse) => {

    promiseList = [];

    // for now just show to game's name
    document.getElementById("topgame").textContent = gameresponse.data[0].name;

    // for each game fetch streams list
    gameresponse.data.forEach(gameData => {
      
      // make the query
      const query = new URLSearchParams(
        {
          game_id: gameData.id,
          first: NUM_STREAMS,
        }
      );

      // Add request to promise list
      promiseList.push(twitchCall(TWITCH_STREAM,query))
    });

    // Process all fetches in a block
    Promise.all(promiseList).then((responses) =>
      // Get json version of data
      Promise.all(responses.map(res => res.json()))
    ).then(dataList => {

      const normalCounts = [];

      // create average curve
      dataList.forEach(streamData => { 
        // gather data for chart
        const normalCount = [];
        streamData.data.forEach(element => {
          normalCount.push(element.viewer_count/streamData.data[0].viewer_count);
          
        });
        normalCounts.push(normalCount)

      })

      const zip = (...arr) => Array(Math.max(...arr.map(a => a.length))).fill().map((_,i) => arr.map(a => a[i])); 

      let middlesStep = zip(...normalCounts)

      const averageCurve = middlesStep.map( positionCounts => {
        var definedCount = 0;
        return positionCounts.reduce((partialSum, a) => {
          if(a !==undefined) { definedCount++; return partialSum + a} else {return partialSum}}, 0)/definedCount;
      })

      dataList.forEach(streamData => {

        const localGameId = streamData.data[0].game_id;
        
        // create HTML element for the game
        const HTMLstring =  chartHTMLStart + localGameId + chartHTMLEnd;
        document.getElementById('topGamesId').insertAdjacentHTML('beforeend', HTMLstring);


        // gather data for chart
        const viewCount = [];
        streamData.data.forEach(element => {
          viewCount.push(element.viewer_count);
          
        });

        //get score
        let score = 0;
        viewCount.forEach( (count, index) => {
          score += (count/viewCount[0]) - averageCurve[index];
        });

        data = [{y: viewCount}];

        layout =  {
          title: 'Viewer fall off: ' + streamData.data[0].game_name + 'Score: ' + score,
        };

        
        TESTER = document.getElementById('tester' + localGameId);
        Plotly.newPlot( TESTER, data , layout);
      })
    })
  })
  .catch((error) => {
    console.log(error);
  });                
    
} else {
  // hide data segment
  document.getElementById("authorized").style.display = "none";
  document.getElementById("preauthorized").style.display = "block";
}