document.addEventListener('DOMContentLoaded', () => {
      // Connect to websocket
      var socket = io.connect(location.protocol + '//' + document.domain + ':' + location.port);
      var user = localStorage.getItem('name');
      var current_channel = localStorage.getItem('channel');
      var defaultchannel = "General";
      var private_room = false;

      if (localStorage.getItem('channel') && localStorage.getItem('name')){
          // load last channel
          socket.emit('load channel', {'channel': current_channel, 'user': user});
          document.querySelector('#channelhead').innerHTML = current_channel;
          console.log(current_channel)
      } else {
          document.querySelector('#channelhead').innerHTML = defaultchannel;
      }

      // Set links up to load new current_channel.
      document.querySelectorAll('.channel-link').forEach(link => {
          link.onclick = () => {
              const page = link.dataset.page;
              localStorage.setItem('channel', page);
              private_room = false;
              document.querySelector('#channelhead').innerHTML = current_channel;
              current_channel = page;
              socket.emit('load channel', {'channel': page, 'user': user});

              return false;
          };
      });

      // Set links up to private message.
      document.querySelectorAll('.private-link').forEach(link => {
          link.onclick = () => {
              const user2 = link.dataset.page;
              localStorage.setItem('channel', user2);
              console.log(user2)
              private_room = True;
              current_channel = user2;
              document.querySelector('#channelhead').innerHTML = user2;
              socket.emit('private chat', {'user1': user, 'user2': user2});
              return false;
          };
      });

      if (!localStorage.getItem('name') || localStorage.getItem('name') == ''){
          var modal = document.getElementById('displayname')
          modal.style.display = "block";
          localStorage.setItem('channel', defaultchannel);

          // By default, submit button is disabled
          document.querySelector('#submit').disabled = true;

          // Enable button only if there is text in the input field
          document.querySelector('#name').onkeyup = () => {
              if (document.querySelector('#name').value.length > 0)
                  document.querySelector('#submit').disabled = false;
              else
                  document.querySelector('#submit').disabled = true;
          };

          document.querySelector('#new-name').onsubmit = () => {

              // Store the new username
              const name = document.querySelector('#name').value;
              localStorage.setItem('name', name);
              socket.emit('store user', {'username': name});
              modal.style.display='none';
              // user exists error
              socket.on('user error', errormsg => {
                 if(!alert(errormsg)){
                   localStorage.setItem('name', '');
                   window.location.reload();
                 }
              });
              socket.emit('load channel', {'channel': defaultchannel, 'user': name});
              document.querySelector('#username').innerHTML = name;
                // Stop form from submitting
                return false;
              };
      } else {
          // sign user in
          const name = localStorage.getItem('name');
          socket.emit('store existing user', {'username': name});
          document.querySelector('#username').innerHTML = name;
    };

    // For old chat messages
    socket.on('old chats', oldchats => {
      if (typeof oldchats === 'string') {
          localStorage.setItem('channel', oldchats);
          current_channel = oldchats;
          document.querySelector('#messages').innerHTML = "";
          document.querySelector('#channelhead').innerHTML = current_channel;
      } else if (oldchats === undefined || oldchats.length == 0) {
          document.querySelector('#messages').innerHTML = "";
          document.querySelector('#channelhead').innerHTML = current_channel;
      } else {
          document.querySelector('#messages').innerHTML = "";
          oldchats.forEach((oldchat) => {
              channel = oldchat["channel"];
              current_channel = channel;
              InsertMessage(oldchat);
            });
        }
     });

      document.querySelector('#logout').onclick = () => {
          localStorage.setItem('name', '');
          document.location.reload()
      };

      document.querySelector('#createchannel').onclick = () => {

          var createbox = document.querySelector('#channelname')
          createbox.style.display = "block";

          // When the user clicks anywhere outside of the modal, close it
          window.onclick = function(event) {
              if (event.target == createbox) {
                  createbox.style.display = "none";
              }
          }
            // By default, submit button is disabled
           document.querySelector('#create').disabled = true;

           // Enable button only if there is text in the input field
           document.querySelector('#channelinput').onkeyup = () => {
               if (document.querySelector('#channelinput').value.length > 0)
                   document.querySelector('#create').disabled = false;
               else
                   document.querySelector('#create').disabled = true;
           };

           document.querySelector('#channelname').onsubmit = () => {
                  // Create channel
                  const channel = document.querySelector('#channelinput').value;
                  socket.emit('create channel', {'channel': channel});
                  current_channel = channel;
                  localStorage.setItem('channel', current_channel);
                  createbox.style.display='none';
                  // Stop form from submitting
                  return false;
            };

        // Show the new set of channels
        socket.on('show channel', data => {
            document.querySelector('#channellist').innerHTML = ""
            // update channel list
            for(i = 0; i <= data.length-1; i++){
              channelList = "<li><a href=\"\" class=\"channel-link\" data-page=\""+data[i]+"\">" + data[i] + "</a></li>";
              document.querySelector('#channellist').innerHTML += channelList;
            };
            socket.emit('load channel', {'channel': current_channel, 'user': user});
            document.querySelector('#channelhead').innerHTML = current_channel;
        });
      };

      // For Messages
      socket.on('message data', messagedata => {
           InsertMessage(messagedata);
       });

       // By default, submit button is disabled
      document.querySelector('#send').disabled = true;

      // Enable button only if there is text in the input field
      document.querySelector('#messageinput').onkeyup = () => {
          if (document.querySelector('#messageinput').value.length > 0)
              document.querySelector('#send').disabled = false;
          else
              document.querySelector('#send').disabled = true;
      };

       document.querySelector('#send').onclick = () => {
            var messageinput = document.querySelector('#messageinput').value;
            if (!private_room) {
              socket.emit("message input", {'user': user, 'message': messageinput, 'channel': current_channel});
            } else {
              socket.emit("private message input", {'user': user, 'message': messageinput, 'user2': current_channel});
            }

            document.querySelector('#messageinput').value = null;
            return false;
       }

       // If hide button is clicked, delete the post.
        document.addEventListener('click', event => {
            const element = event.target;
            if (element.className === 'hide btn btn-outline-secondary btn-small') {
                element.parentElement.style.animationPlayState = 'running';
                element.parentElement.addEventListener('animationend', () =>  {
                    element.parentElement.remove();
                });
            }
        });

        function InsertMessage(messagedata) {
            // Template for messages
            const template = Handlebars.compile(document.querySelector('#load_messages').innerHTML);
            message = messagedata["message"];
            username = messagedata["username"];
            channel = messagedata["channel"];
            time = messagedata["time"];
            // Insert messages
            // Add message result to DOM.
            const messages = template({'username': username, 'message': message, 'time': time});
            document.querySelector('#messages').innerHTML += messages;
        }


});
