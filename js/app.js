var app = angular.module('app', []);
var api = 'https://secret-hamlet-30641.herokuapp.com';

app.controller('BigFiveController', function($scope, $http, $window) {
  $http({
    method: 'GET',
    url: api + '/bigFiveQuestions'
  }).then(function(response) {
    $scope.questions = response.data;
    document.getElementById('userId').value = $window.sessionStorage.getItem('userId');
  }, function(error) {
    console.log("Error occured when loading the big five questions");
  });


});

app.controller('HomeController', function($scope, $http, $window) {
  $scope.user = {};

  $('#gender-specified').change(function() {
    if (this.checked) {
      $('#gender-text').prop('required', true);
    } else {
      $('#gender-text').prop('required', false);
    }
  });

  $scope.submitDetails = function(user) {
    if (user.questionSet && user.gender && user.age && user.education && user.field && (user.gender == 'specified' ? user.genderSpecified : true)) {
      $http({
        method: 'POST',
        url: api + '/user',
        data: user,
        type: JSON,
      }).then(function(response) {
        $window.sessionStorage.setItem('userId', response.data);
        $window.sessionStorage.setItem('questionSet', user.questionSet);
        $window.location.href = './quiz.html';
      }, function(error) {
        console.log("Error occured when submitting user details");
      });
    }

  };
});

app.controller('QuizController', function($scope, $http, $window, $timeout) {

  $scope.userId = $window.sessionStorage.getItem('userId');
  $scope.questionSet = $window.sessionStorage.getItem('questionSet');
  $scope.question = {};
  $scope.sliderChanged = false;
  $scope.onbeforeunloadEnabled = true;
  $scope.count = 0;

  //Chatbot related variables
  $scope.history = [{
    name: "QuizBot",
    msg: "Hi, I am QuizBot and welcome to our quiz program! :) "
  }];

  $timeout(function() {
    $scope.history.push({
      name: "QuizBot",
      msg: "Our quiz contains both subjective and objective MCQs. 'Subjective' questions will ask for your opinion and 'Objective' questions will test your IQ."
    });

    $scope.history.push({
      name: "QuizBot",
      msg: "I can help you answer the questions in many ways. First, let's start with two example questions for training purposes. Type 'TRAIN' to start the training."
    });
  }, 1000);

  $("input[type='range']").change(function() {
    $scope.sliderChanged = true;
    $("#submit-button").css("display", "block");
    $("#output").css("color", "green");

    if ($scope.question.questionNumber < 0) {
      if ($scope.count == 0) {
        $timeout(function() {
          $scope.history.push({
            name: "QuizBot",
            msg: "Now click on the 'Submit' button to submit your initial answer and see feedback from others who attempted the quiz."
          });
        }, 500);
      } else {
        $timeout(function() {
          $scope.history.push({
            name: "QuizBot",
            msg: "Now click on the 'Submit' button to submit your final answer and move to the next question."
          });
        }, 500);
      }
    }

    $timeout(function() {
      $scope.scrollAdjust();
    }, 500);
  });

  //Setting the question one
  $http({
    method: 'POST',
    url: api + '/question',
    data: {
      set: $scope.questionSet,
      id: -2
    },
    type: JSON,
  }).then(function(response) {
    $scope.question = response.data;
    if ($scope.question.img) {
      $("#image-container").css("display", "inline");
    } else {
      $("#image-container").css("display", "none");
    }

  }, function(error) {
    console.log("Error occured when getting the first question");
  });

  //Confirmation message before reload and back
  $window.onbeforeunload = function(e) {
    if ($scope.onbeforeunloadEnabled) {
      var dialogText = 'You have unsaved changes. Are you sure you want to leave the site?';
      e.returnValue = dialogText;
      return dialogText;
    }
  };

  //Initialization
  $scope.count = 0;
  $scope.myAnswer = {};
  $scope.myAnswer.confidence = 50;
  $scope.myAnswer.userId = $scope.userId;
  $scope.myAnswer.questionSet = $scope.questionSet;

  //Show only when the answer is selected
  $scope.clicked = function() {

    //Resetting the red line
    if ($scope.question.questionNumber < 0) {
      $("#qBox").css("border", "none");
      $("#confidence-container").css("border", "solid red");

      $("#confidence-container").css("display", "block");
      $scope.history.push({
        name: "QuizBot",
        msg: "Next, move the slider to show how confident you are of the selected answer. Higher the confidence, higher the value selected should be."
      });
    } else {
      $("#confidence-container").css("display", "block");
      $scope.history.push({
        name: "QuizBot",
        msg: "Move the slider to show how confident you are of the selected answer. Click on submit when done!"
      });
    }

    $timeout(function() {
      $scope.scrollAdjust();
    }, 500);
  };

  $scope.submitAnswer = function() {

    if ($scope.sliderChanged) {
      //Remove the button
      $("#submit-button").css("display", "none");
      //Disbling the input
      $("input[type=radio]").attr('disabled', true);
      $("input[type=range]").attr('disabled', true);
      //Loader activated
      $("#loader").css("display", "block");
      $("#loader-text").css("display", "block");

      $scope.myAnswer.answerId = parseInt($scope.myAnswer.answerId);
      $scope.myAnswer.questionId = $scope.question.questionNumber;
      $scope.myAnswer.userId = $scope.userId;
      $scope.myAnswer.questionSet = $scope.questionSet;

      $http({
        method: 'POST',
        url: api + '/chartData',
        data: $scope.myAnswer,
        type: JSON,
      }).then(function(response) {
        $scope.myAnswer.answerId = $scope.myAnswer.answerId.toString();
        $timeout(function() {
          $scope.createChart(response.data);
          $scope.showSummary(response.data.description);
        }, 3000);

      }, function(error) {
        console.log("Error occured when loading the chart");
      });
    }
  };

  $scope.showSummary = function(summary) {
    //Once the chart is visible add the training description
    if ($scope.question.questionNumber < 0) {
      $("#confidence-container").css("border", "none");
      $("#change-section").css("display", "none");

      $timeout(function() {
        $scope.history.push({
          name: "QuizBot",
          msg: "The chart given above demonstrates how other participants attempted the same question. The votes given for each answer option is shown as a percentage of the total votes."
        });
      }, 500);

      $timeout(function() {
        $scope.scrollAdjust();
      }, 500);

      $timeout(function() {
        $scope.history.push(summary);
      }, 4000);

      $timeout(function() {
        $scope.scrollAdjust();
      }, 4000);

      $timeout(function() {
        $scope.history.push({
          name: "QuizBot",
          msg: "At this point, you may do one of the following:"
        });
        $scope.history.push({
          msg: "Option 1 : Change the answer option and select new confidence level"
        });
        $scope.history.push({
          msg: "Option 2 : Keep the answer option unchanged and select new confidence level"
        });
      }, 8000);

      $timeout(function() {
        $scope.scrollAdjust();
      }, 8000);

      $timeout(function() {
        $("#change-section").css("border", "solid red");
        $("#change-section").css("display", "block");
        $scope.history.push({
          name: "QuizBot",
          msg: "Would you like to change your answer? Click on 'YES' to make a change or 'NO' to go to the next question."
        });
      }, 12000);

      $timeout(function() {
        $scope.scrollAdjust();
      }, 12000);

    } else {
      $scope.history.push(summary);
      $scope.history.push({
        name: "QuizBot",
        msg: "Would you like to change your answer? Click on 'YES' to make a change or 'NO' to go to the next question."
      });
      $timeout(function() {
        $scope.scrollAdjust();
      }, 500);
    }

  };

  $scope.createChart = function(chartData) {
    // Load the Visualization API and the corechart package.
    google.charts.load('current', {
      'packages': ['corechart']
    });
    // Set a callback to run when the Google Visualization API is loaded.
    google.charts.setOnLoadCallback(drawChart);

    $("#loader").css("display", "none");
    $("#loader-text").css("display", "none");

    $("#chart_div").css("display", "block");
    $("#change-section").css("display", "block");

    function drawChart() {
      // Create the data table.
      var data = new google.visualization.DataTable();
      data.addColumn('string', 'Answer');
      data.addColumn('number', 'Votes (%)');
      data.addColumn({
        type: 'string',
        role: 'annotation'
      });

      data.addRows([
        [chartData.answers[0].answer.toString(), chartData.answers[0].value, chartData.answers[0].value.toString() + ' %'],
        [chartData.answers[1].answer.toString(), chartData.answers[1].value, chartData.answers[1].value.toString() + ' %'],
        [chartData.answers[2].answer.toString(), chartData.answers[2].value, chartData.answers[2].value.toString() + ' %'],
        [chartData.answers[3].answer.toString(), chartData.answers[3].value, chartData.answers[3].value.toString() + ' %']
      ]);

      // Set chart options
      var options = {
        'width': 500,
        'height': 370,
        'title': "See how others have answered this question..",
        'titleTextStyle': {
          fontSize: 16
        },
        'hAxis': {
          'title': 'Selected answer'
        },
        'vAxis': {
          'title': '% of votes by others',
          'ticks': [{
              v: 0,
              f: '0%'
            }, {
              v: 10,
              f: '10%'
            }, {
              v: 20,
              f: '20%'
            }, {
              v: 30,
              f: '30%'
            },
            {
              v: 40,
              f: '40%'
            },
            {
              v: 50,
              f: '50%'
            },
            {
              v: 60,
              f: '60%'
            },
            {
              v: 70,
              f: '70%'
            },
            {
              v: 80,
              f: '80%'
            },
            {
              v: 90,
              f: '90%'
            },
            {
              v: 100,
              f: '100%'
            }
          ]
        }
      };

      // Instantiate and draw our chart, passing in some options.
      var chart = new google.visualization.ColumnChart(document.getElementById('chart_div'));
      chart.draw(data, options);
    }
  };

  $scope.yes = function() {

    $scope.count = 1;

    $("#submit-button").css("display", "none");
    $("#change-section").css("border", "none");

    if ($scope.question.questionNumber < 0) {
      $scope.history.push({
        name: "QuizBot",
        msg: "You can now change your answer and confidence."
      });
      $timeout(function() {
        $scope.scrollAdjust();
      }, 500);
    } else {
      $scope.history.push({
        name: "QuizBot",
        msg: "You can now change your answer and confidence. Click on 'Submit' to confirm your answer."
      });
      $timeout(function() {
        $scope.scrollAdjust();
      }, 500);
    }

    //Make the input enabled
    $("input[type=radio]").attr('disabled', false);
    $("input[type=range]").attr('disabled', false);

    //Remove change section buttons
    $("#change-section").css("display", "none");

    //Set the confidence to 50
    $scope.myAnswer.confidence = 50;
    $scope.sliderChanged = false;
    $("#output").val("Not Specified");
    $("#output").css("color", "red");
  };

  $scope.update = function() {
    console.log("Inside update");
    if ($scope.sliderChanged) {
      //Disable the button
      $("#submit-button").attr("disabled", "disabled");
      $("#confidence-container").css("display", "none");

      $scope.myAnswer.answerId = parseInt($scope.myAnswer.answerId);
      $scope.myAnswer.questionId = $scope.question.questionNumber;
      $scope.myAnswer.userId = $scope.userId;
      $scope.myAnswer.questionSet = $scope.questionSet;

      $http({
        method: 'POST',
        url: api + '/updateAnswer',
        data: $scope.myAnswer,
        type: JSON,
      }).then(function(response) {
        $scope.next();
      }, function(error) {
        console.log("Error occured when updating the answers");
      });
    }
  };

  $scope.next = function() {
    $scope.count = 0;

    //Make the input enabled and submit invisible
    $("input[type=radio]").attr('disabled', false);
    $("input[type=range]").attr('disabled', false);
    $("#submit-button").css("display", "none");
    $("#confidence-container").css("display", "none");
    $("#change-section").css("border", "none");

    //Handling the ending of the quiz and directing to the big five questionnaire
    if (parseInt($scope.myAnswer.questionId) == 5) {
      //Disable the confirmation message
      $scope.onbeforeunloadEnabled = false;
      $window.location.href = './big-five.html';
    } else {
      $scope.userId = $window.sessionStorage.getItem('userId');
      var data = {
        set: $scope.questionSet,
        id: parseInt($scope.myAnswer.questionId) + 1
      };

      $http({
        method: 'POST',
        url: api + '/question',
        data: data,
        type: JSON,
      }).then(function(response) {

        $scope.myAnswer = {};
        $scope.sliderChanged = false;
        $scope.myAnswer.confidence = 50;
        $scope.question = response.data;

        if ($scope.question.questionNumber == 0) {
          $("#question-area").css("display", "none");
          $scope.history.push({
            name: "QuizBot",
            msg: "The training is complete! You may now attempt the quiz. The quiz contains 34 objective and subjective MCQs. To start the quiz type 'GO'. Do NOT refresh the page or go back during the quiz."
          });

          $timeout(function() {
            $scope.scrollAdjust();
          }, 500);
        } else if ($scope.question.questionNumber == -1) {
          $scope.history.push({
            name: "QuizBot",
            msg: "Now, let's look at a 'Subjective' question which asks for your opinion on a statement. You may select an answer based on whether you agree or disagree with the given statement."
          });
          $scope.history.push({
            msg: "Type 'HELP' to understand the meaning of difficult words in this question."
          });
          $timeout(function() {
            $scope.scrollAdjust();
          }, 500);
        } else {
          $scope.history.push({
            name: "QuizBot",
            msg: "Moving to the next question (" + ($scope.question.questionNumber + 1).toString() + "/34). If you need my help with words type 'HELP'."
          });
          $timeout(function() {
            $scope.scrollAdjust();
          }, 500);
        }

        if ($scope.question.img) {
          $("#image-container").css("display", "inline");
        } else {
          $("#image-container").css("display", "none");
        }

        $("#loader").css("display", "none");
        $("#loader-text").css("display", "none");
        $("#chart_div").css("display", "none");
        $("#change-section").css("display", "none");
        $("#submit-button").prop("disabled", false);
        $("#output").val("Not Specified");
        $("#output").css("color", "red");

      }, function(error) {
        console.log("Error occured when loading the question");
      });
    }
  };

  //Chatbot function to start the quiz
  $scope.userState = "ready"; //Ready to start

  //Function to adjust scrolling - not working
  $scope.scrollAdjust = function() {
    var element = document.getElementById("text-area");
    element.scrollTop = element.scrollHeight;
  };

  $scope.train = function() {
    $scope.userState = "trained"; //Started the training
    $("#question-area").css("display", "inline");
    $("#qBox").css("border", "solid red");

    $scope.history.push({
      name: "QuizBot",
      msg: "Given above is an example  of an 'Objective' question that could appear in the quiz. As your mentor I can help you understand the question, by explaining what certain words included in the question mean."
    });

    $timeout(function() {
      $scope.scrollAdjust();
    }, 500);

    $timeout(function() {
      $scope.history.push({
        msg: "Now, type 'HELP' to understand the meaning of difficult words in this question."
      });
    }, 500);

    $timeout(function() {
      $scope.scrollAdjust();
    }, 500);
  };

  $scope.go = function() {
    $("#question-area").css("display", "inline");
    $scope.history.push({
      name: "QuizBot",
      msg: "You just started the quiz! As your mentor, I can help you understand the question by explaining what certain words in the question mean. If you need my help type 'HELP'."
    });

    $scope.userState = "started"; //Started the quiz
    $timeout(function() {
      $scope.scrollAdjust();
    }, 500);
  };

  $scope.help = function(words) {
    if (words != undefined) {
      $scope.history.push({
        name: "QuizBot",
        msg: "I can explain the following words related to this question."
      });

      for (var i = 0; i < words.length; i++) {
        var text = "";
        text += (i + 1).toString() + " : " + words[i].key;
        $scope.history.push({
          msg: text
        });
      }
      $scope.history.push({
        msg: "Type 'EXPLAIN' and the word to find the meaning. e.g. EXPLAIN " + words[0].key
      });
      $scope.message = "";
    } else {
      $scope.history.push({
        name: "QuizBot",
        msg: "Oops! Seems like there are no words I can help you with in this questions."
      });
      $scope.message = "";
    }

  };

  $scope.explain = function(handle) {
    //Get the word
    var word = handle.split(" ")[1];
    var words = $scope.question.words;
    for (var i = 0; i < words.length; i++) {
      if (word == undefined) {
        $scope.history.push({
          name: "QuizBot",
          msg: "I am sorry. Seems like you did not enter a word. Type 'EXPLAIN' and the word to find the meaning. e.g. EXPLAIN " + words[0].key
        });
      } else if (word.toLowerCase() == words[i].key) {
        $scope.history.push({
          name: "QuizBot",
          msg: words[i].key + " => " + words[i].explaination
        });

        //If in training
        if ($scope.question.questionNumber < 0) {
          $scope.history.push({
            name: "QuizBot",
            msg: "Now you can better understand the difficult words in the question and select the most appropriate answer."
          });
          $timeout(function() {
            $scope.scrollAdjust();
          }, 500);
        }

      } else {
        $scope.history.push({
          name: "QuizBot",
          msg: "I am sorry. I can't provide an interpretation for the word you entered."
        });
        $scope.help(words);
      }
    }

    $scope.message = "";
  };

  $scope.error = function() {
    $scope.history.push({
      name: "QuizBot",
      msg: "Oops! I don't recognize this command. Please try again."
    });

    //Check user state and repeat instruction
    switch ($scope.userState) {
      case 'help':
        $scope.help($scope.question.words)
        break;
      default:
        $scope.message = "";
    }
  };

  //Call sendMessage on Enter

  var chatBox = document.getElementById("chat-text");

  // Execute a function when the user releases a key on the keyboard
  chatBox.addEventListener("keyup", function(event) {
    // Cancel the default action, if needed
    event.preventDefault();
    // Number 13 is the "Enter" key on the keyboard
    if (event.keyCode === 13) {
      document.getElementById("sendButton").click();
    }
  });

  $scope.sendMessage = function() {

    if ($scope.message != undefined && $scope.message.trim().length != 0) {
      $scope.history.push({
        name: "You",
        msg: $scope.message.toString()
      });
      $timeout(function() {
        $scope.scrollAdjust();
      }, 500);

      //Handle requests
      var handle = $scope.message.toLowerCase();

      if (handle == 'go') {
        if ($scope.userState == "trained") {
          $scope.go();
        } else {
          $scope.history.push({
            name: "QuizBot",
            msg: "You have already started the quiz."
          });
        }
        $scope.message = "";

      } else if (handle == 'train') {
        if ($scope.userState == "ready") {
          $scope.train();
        } else {
          $scope.history.push({
            name: "QuizBot",
            msg: "You have already started the training."
          });
        }
        $scope.message = "";
      } else if (handle == 'help') {
        $scope.userState = "help";
        $scope.help($scope.question.words);

      } else if (handle.includes('explain')) {
        $scope.userState = "explain";
        $scope.explain(handle);
      } else {
        $scope.error(handle);
      }
    }
  };

});
