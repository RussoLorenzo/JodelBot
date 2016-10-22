  var request = require('request');
  var sleep = require('sleep');
  var fs = require('fs');
  var endpoint = "https://api.go-tellm.com";
  var access_token = " YOUR ACCESS TOKEN HERE";
  var lat = "YOUR LAT";
  var lng = "YOUR LNG";
  var latest = "0";
  var limit = "60";
  var end = 0;
  var a = 0;
  var options = {
    headers: {
      'User-Agent': 'Jodel/3.29 (iPhone; iOS 10.0.2; Scale/2.00)' //Emulo l'User Agent dell'app.
    }
  };
  console.log("[INFO] Starting JodelBot..");
  console.log("[INFO] Access Token: " + access_token);
  console.log("[INFO] Location: " + lat + ", " + lng);
  endpoint_check(); //Se l'endpoint non ha bloccato il nostro ip
  function restart() {
    a=0; //reset dei contatori
    end=0;
    get_karma();
  }
  function endpoint_check() {
    request(endpoint, function (error, response, body) {
      if (!error && response.statusCode == 200) { //Se non ci sono errori e lo status code è 200
        console.log("[INFO] Endpoint connected: " + endpoint);
        get_karma(); //Ottengo il karma attuale
      } else {
        console.log("[ERROR] Endpoint offline or with errors: " + endpoint);
        return 0;
      }
    });
  }
  function get_karma() {
    request(endpoint + "/api/v2/users/karma?access_token=" + access_token, function (error, response, body) {
      var karma = JSON.parse(response.body); //La API risponde in JSON
      console.log("[INFO] User karma: " + karma.karma);
      user_config();
    });
  }
  function user_config() {
    request(endpoint + "/api/v3/user/config?access_token=" + access_token, function (error, response, body) {
      var config = JSON.parse(response.body);
      console.log("[INFO] Moderator: " + config.moderator); //Esiste la funzione moderatore, attivabile server-side
      console.log("[INFO] Channel follow limit: " + config.channels_follow_limit); //Si possono seguire al massimo 100 canali (o Jodel?)
      console.log("[INFO] Location: " + config.location); //Come un ID di una cella che comprende l'università
      get_post(); //Ottengo i primi 10 post
    });
  }
  function get_post() {
    console.log("[INFO] Upvoting first 10 posts..");
    //console.log(endpoint + "/api/v3/posts/location/combo?lng=" + lng + "&lat=" + lat + "&home=false&stickies=true&access_token=" + access_token)
    request(endpoint + "/api/v3/posts/location/combo?lng=" + lng + "&lat=" + lat + "&home=false&stickies=true&access_token=" + access_token, function (error, response, body) {
      var posts = JSON.parse(response.body); //Come prima
      var data = posts.recent;
      for(var i = 0; i < data.length; i++) { //Faccio una richiesta di upvote per tutti i post
        latest = (posts.recent[i].post_id);
        request.put(endpoint + "/api/v2/posts/" + posts.recent[i].post_id + "/upvote?access_token=" + access_token, function (error, response, body) {
          sleep.sleep(1); //1 secondo tra una richiesta e l'altra

        });
      }
      console.log("[INFO] Got 10 posts.. Asking for more."); //Simulo lo scroll nell'app
      fs.stat('latest.txt', function(err, stat) {
        if(err == null) {
          fs.readFile('latest.txt', 'utf8', function (err,data) { //Controllo se il file latest con l'ultimo post è presente
          latest = data;
          console.log("[INFO] Latest post restored. Post #" + latest);
          scroll_down();
        });
      } else if(err.code == 'ENOENT') {
        console.log("[INFO] File latest doesn't exist.")
        scroll_down();
      } else {
        console.log('[INFO] Error reading latest: ', err.code);
        scroll_down();
      }
    });
  });
  }

  function scroll_down() { //Richiedo i nuovi post e upvoto
    console.log("[INFO] Requesting other " + limit + " posts.." + " Latest: " + latest);
    //console.log(endpoint + "/api/v2/posts/location?lng=" + lng + "&lat=" + lat + "&home=false&after=" + latest + "&access_token=" + access_token + "&limit=" + limit)
    request(endpoint + "/api/v2/posts/location?lng=" + lng + "&lat=" + lat + "&home=false&after=" + latest + "&access_token=" + access_token + "&limit=" + limit, function (error, response, body) {
      var posts = JSON.parse(response.body);
      var data = posts.posts;
      //latest = (data[100].post_id);
      end = data.length;
      console.log("[INFO] Got " + end + " posts from server. Starting upvoting.. \n\n");
      if(end == 0){ //Se l'API risponde con 0 post, elimino il file latest e riavvio
      fs.unlink('latest.txt');
      console.log("[INFO] No posts: Restarting and deleting latest file...");
      restart();
    }
    for(var i = 0; i < data.length; i++) {
      latest = posts.posts[i].post_id;
      fs.writeFile("latest.txt", latest);
      request.put(endpoint + "/api/v2/posts/" + posts.posts[i].post_id + "/upvote?access_token=" + access_token, function (error, response, body) {
        sleep.sleep(1);
        a=a+1; //TODO Meno contatori
        if(response.statusCode == 200) {
          console.log("[INFO] Post #" + a + " voted successfully.");
        }
        if(a==end){
          sleep.sleep(5);
          restart(); }
        });
      }
    });
  }
  process.on('uncaughtException', function(err) { //Recupero gli errori causati dall'undefined nelle richieste HTTP
  console.log('[ERROR] Caught exception: ' + err);
  sleep.sleep(30);
  restart();
  });
