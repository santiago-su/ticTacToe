$(document).ready(function() {
  // Wait for animations to start before showing start buttons
  $('.start-buttons').hide();
  $('.start-buttons').fadeIn(2000);
  $('.reset-buttons').hide();

  // Define variables
  var clientSocket = io();
  var matrix = [0,1,2,
                3,4,5,
                6,7,8];

  var answers = Array(9);
  var counter = 0;
  var win = false;
  var playerOne = { turn: true, id: "" };
  var playerTwo = { turn: false, id: "" };

  // Check if rows are in a win state
  var rows = function(player, row, matrixLength) {
    var win = [];
    for (var i = (row - 1) * matrixLength; i < (matrixLength * row); i++) {
      win.push(answers[i] === player);
    }
    return win.every(function(a) { return !!a });
  }

  // Check if columns are in a win state
  var columns = function(player, column, matrixLength) {
    var win = [];
    for (var i = column - 1; i < answers.length; i += matrixLength) {
      win.push(answers[i] === player);
    }
    return win.every(function(a) { return !!a });
  }

  // Check if forward diagonal is in a win state
  var forwardDiagonal = function(player, matrixLength) {
    var win = [];
    for (var i = 0; i < answers.length; i += (matrixLength + 1)) {
      win.push(answers[i] === player);
    }
    return win.every(function(a) { return !!a });
  }

  // Check if backwards diagonal is in a win state
  var backwardsDiagonal = function(player, matrixLength) {
    var win = [];
    for (var i = matrixLength - 1; i < answers.length - (matrixLength - 1); i += (matrixLength - 1)) {
      win.push(answers[i] === player);
    }
    return win.every(function(a) { return !!a });
  }

  // Check if player 1 has won
  var checkXwin = function() {
    return rows('x', 1, 3) || rows('x', 2, 3) || rows('x', 3, 3) ||
      columns('x', 1, 3) || columns ('x', 2, 3) || columns('x',3 ,3) ||
      forwardDiagonal('x', 3) || backwardsDiagonal('x', 3);
  }

  // Check if player 2 has won
  var checkOwin = function() {
    return rows('o', 1, 3) || rows('o', 2, 3) || rows('o', 3, 3) ||
      columns('o', 1, 3) || columns ('o', 2, 3) || columns('o',3 ,3) ||
      forwardDiagonal('o', 3) || backwardsDiagonal('o', 3);
  }

  // Handle win
  var winner = function() {
    if (checkXwin()) {
      clientSocket.emit('winState', { winner: "X" });
    } else if (checkOwin()) {
      clientSocket.emit('winState', { winner: "O" });
    } else {
      if (counter === 9) {
        clientSocket.emit('winState', { winner: 'draw' });
        // resetBoard();
      }
    }
  }

  // Generate an empty game board
  var generateGameBoard = function(matrixLength) {
    var length = matrixLength * matrixLength
    for(var i = 0; i < length; i++) {
      $('#game-board').append('<div class="box" data-num="' + i + '" id="box-' +
        (i+1) + '"></div>')
    }
  }

  var resetBoard = function() {
    $('#game-board').html('');
    // answers = Array(9);
    // generateGameBoard(3);
    // counter = 0;
  }

  // Insert the moving piece on the answers matrix
  var move = function(dataNum, type) {
    answers.splice(dataNum, 1, type);
  }

  var updateUi = function(index) {
    var imgO = '<img class="o" src="./images/o.svg">';
    var imgX = '<img class="x" src="./images/x.svg">';
    var box = $('div').find("[data-num='" + index + "']");
    if(answers[index] === 'o' && box.is(':empty')) {
      $(box).append(imgO);
    } else if (answers[index] === 'x' && box.is(':empty')) {
      $(box).append(imgX);
    }
  }

  var paintBoard = function() {
    for (var i = 0; i < answers.length; i++) {
      updateUi(i);
    }
  }

  $('#waiting-screen').hide();
  generateGameBoard(3);

  clientSocket.on('winState', function(state) {
    resetBoard();
    if (state.winner === 'draw') {
      $('#win-screen').html("It's a draw");
      $('.reset-buttons').fadeIn(2000);
    } else {
      $('#win-screen').html('Winner is ' + state.winner);
      $('.reset-buttons').fadeIn(2000);
    }
  })

  // Receive board State and handle rewriting variables and re painting board
  clientSocket.on('boardState', function(state) {
    console.log(state.answers, state.counter)
    answers = state.answers
    playerOne.turn = state.playerTurn
    playerTwo.turn = !state.playerTurn
    counter = state.counter
    paintBoard()

    if (state.playerTurn) {
      playerOne.id = state.playerId
    } else {
      playerTwo.id = state.playerId
    }

    if (state.playerId === clientSocket.id) {
      $('div').css({cursor: 'wait'})
    } else {
      $('div').css({cursor: 'pointer'})
    }
  })

  // Handle turns and first insertion of board state
  $('.box').each(function() {
    $(this).on('click', function() {
      counter++;
      if (playerOne.turn) {
        var imgO = '<img class="o" src="./images/o.svg">';
        $(this).append(imgO);
        move($(this).data('num'), 'o');
        winner()
      } else {
        var imgX = '<img class="x" src="./images/x.svg">';
        $(this).append(imgX);
        move($(this).data('num'), 'x');
        winner();
      }
      // Emit the board state to our server with current variables
      clientSocket.emit('boardState', { answers: answers,
                                        counter: counter,
                                        playerTurn: !playerOne.turn,
                                        playerId: clientSocket.id });
    })
  })

  // Check if two users are connected to start the game
  clientSocket.on('usersConnected', function (ids) {

    playerOne.readableId, playerTwo.readableId = ids[0], ids[1];

    if (ids.length === 2) {
      $('#first-page').addClass('hidden');
      $('#waiting-screen').fadeOut(1000);
      $('#game-board').fadeIn(2000).css({ display: 'flex' });
    }

    $('#start-multiplayer').on('click', function() {
      if (ids.length < 2) {
        $('#first-page').addClass('animated rotateOutUpLeft').one(
          'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function() {
            $('#first-page').addClass('hidden');
            $('#waiting-screen').fadeIn(1000);
          }
        );
      } else {
        $('#first-page').addClass('animated rotateOutUpLeft').one(
          'webkitAnimationEnd mozAnimationEnd MSAnimationEnd oanimationend animationend', function() {
            $('#first-page').addClass('hidden');
            $('#waiting-screen').fadeOut(1000);
            $('#game-board').fadeIn(2000).css({ display: 'flex' });
          }
        );
      }
    })

    $('#play-again').on('click', function() {
      window.location.reload();
    })
  })
})
