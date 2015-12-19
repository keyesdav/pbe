(function() {

  var app = angular.module('PbeApp', ['ui.router', 'ngMaterial', 'ngMdIcons', 'pbeServices', 'sticky']);

  app.config(['$stateProvider', '$urlRouterProvider', function($stateProvider, $urlRouterProvider) {
    $urlRouterProvider.otherwise('/');

    $stateProvider
      .state('tests', {
        url: '/',
        templateUrl: 'partials/test-list.html',
        controller: 'TestController'
      })
      .state('test-edit', {
        url: '/tests/:testId',
        templateUrl: 'partials/test-edit.html',
        controller: 'TestEditController'
      })
      .state('test-score', {
        url: '/score/:testId',
        templateUrl: 'partials/test-score.html',
        controller: 'ScoreController'
      })

  }]);

  app.controller('MainAppController', ['$scope', '$state', '$mdBottomSheet', '$mdSidenav', '$mdDialog', '$mdComponentRegistry', 'PbeTests', function($scope, $state, $mdBottomSheet, $mdSidenav, $mdDialog, $mdComponentRegistry, PbeTests) {

    $scope.activity = "";

    $scope.sidebar = {};
    $scope.sidebar.tests = [{
      link: 'showTestManager',
      title: 'Manage Tests',
      icon: 'view_list'
    }, {
      link: 'showQuestionSheet',
      title: 'Edit Questions',
      icon: 'playlist_add_check'
    }];
    $scope.sidebar.members = [{
      link: 'manageUsers',
      title: 'Manage Users',
      icon: 'account_box'
    }, {
      link: 'trackMemberProgress',
      title: 'Track Users',
      icon: 'dashboard'
    }];

    ///////////////////
    // this method is called by child controllers to set the description
    // of the activity being performed...
    $scope.setActivity = function(act) {
      $scope.activity = act;
    }

    $scope.callFunction = function(func, evnt) {
      if (angular.isFunction($scope[func])) {
        $scope[func](evnt);
      }
    }


    // HACK, HACK, HACK
    // the sidenav changes the overflow-y property on the body to "auto", which isn't nice on mobile wrt to "pull to refresh page" semantics
    // the following code is used watch for the sidenav to close, and then manually set the overflow-y back to "hidden"
    // https://github.com/angular/material/issues/3179
    $scope.isOpen = function() { return false };
    // Register binding function
    $mdComponentRegistry
                .when("left")
                .then( function(sideNav){
                    $scope.isOpen = angular.bind(sideNav, sideNav.isOpen );
     });
     $scope.$watch(function(scope){return scope.isOpen()},function(newValue,oldValue){
        if(newValue == false){
          console.log("sidenav closed...");
          setTimeout(function(){
            $("body").css("overflow-y", "hidden");
          }, 250);
        }
     },true);
     

    $scope.toggleSidenav = function(){
      $mdSidenav('left').toggle();

    }

    $scope.showTestManager = function(){
      $mdSidenav('left').toggle();

      
      $state.go('tests');

    }

    $scope.showQuestionSheet = function(testId) {
      window.open("https://docs.google.com/spreadsheets/d/1DnPIlQmBcuB8c0gjy_PWpwTJgSdLc63TgR03IC_Jrs0/edit#gid=0", "_blank");
    }
    
    $scope.manageUsers = function(){
      console.log("isOpen: "+$scope.isOpen());
    }

    $scope.editStory = function($event) {
      $state.go('test-edit', {
        testId: "1"
      });

    }


  }]);


  app.config(function($mdThemingProvider) {
    // var customBlueMap = 		$mdThemingProvider.extendPalette('light-blue', {
    //   'contrastDefaultColor': 'light',
    //   'contrastDarkColors': ['50'],
    //   '50': 'ffffff'
    // });
    // $mdThemingProvider.definePalette('customBlue', customBlueMap);
    // $mdThemingProvider.theme('default')
    //   .primaryPalette('customBlue', {
    //     'default': '500',
    //     'hue-1': '50'
    //   })
    //   .accentPalette('pink');
    // $mdThemingProvider.theme('input', 'default')
    //       .primaryPalette('grey')


    var customBlueMap = $mdThemingProvider.extendPalette('light-blue', {
      'contrastDefaultColor': 'light',
      'contrastDarkColors': ['50'],
      '50': 'ffffff'
    });
    $mdThemingProvider.definePalette('customBlue', customBlueMap);
    $mdThemingProvider.theme('pbe')
      .primaryPalette('blue', {
        'default': '500',
        'hue-1': '50'
      })
      .accentPalette('red')
      .warnPalette('red');

    $mdThemingProvider.theme('input', 'default')
      .primaryPalette('grey')

    $mdThemingProvider.setDefaultTheme('pbe');
  });




  app.controller("TestController", function($scope, $state, $mdDialog, PbeService) {

    $scope.$parent.selectedTestId = "";

    $scope.tests = PbeService.getTests().$promise.then(function(tests) {
      $scope.tests = tests;
    });

    $scope.getStoryCount = function() {
      return $scope.tests.count;
    }

    $scope.handleMenuClick = function(menu, testId, evt) {
      if (menu == "Edit") {

        $scope.editTest(testId);
      }

      else if (menu == "Delete") {
        $scope.deleteTest(testId, evt);
      }

      else if (menu == "Present") {
        $scope.presentTest(testId)
      }

      else if (menu == "Score") {
        $scope.scoreTest(testId)
      }

    }

    $scope.presentTest = function(testId) {
      window.open("/slides?id=" + testId, "_blank");
    }

    $scope.scoreTest = function(testId) {

      PbeService.setSelectedTestId(testId);

      for (var i = 0; i < $scope.tests.length; i++) {
        if ($scope.tests[i].TestId == testId) {
          PbeService.setSelectedTest($scope.tests[i]);
          break;
        }
      }

      $state.go('test-score', {
        "testId": testId
      });
      // $state.go('test-edit');

    }


    $scope.editTest = function(testId) {

      if (typeof testId === 'undefined' || testId == "") {
        $state.go('test-edit', {
          "testId": testId
        });
        // $state.go('test-edit');
      }
      else {
        PbeService.setSelectedTestId(testId);

        for (var i = 0; i < $scope.tests.length; i++) {
          if ($scope.tests[i].TestId == testId) {
            PbeService.setSelectedTest($scope.tests[i]);
            break;
          }
        }

        $state.go('test-edit', {
          "testId": testId
        });
        // $state.go('test-edit');

      }
    }

    $scope.deleteTest = function(testId, evt) {
      
      var confirm = $mdDialog.confirm()
        .title('Delete Test?')
        .content('Are you sure that you want to delete this test?')
        .targetEvent(evt)
        .ok('OK')
        .cancel('Cancel');
      $mdDialog.show(confirm).then(function() {

        PbeService.deleteTest(testId);
        PbeService.invalidateTestList();
        $state.go($state.current, {}, {
          reload: true
        });
        
      }, function() {

        // DOH!  No error handling cause I'm lazy...
      });

    }


  });


  app.controller("TestEditController", function($scope, $state, $q, $stateParams, $cacheFactory, $timeout, $mdDialog, PbeService) {

    var passedTestId = $stateParams.testId;

    $scope.selectedTab = 0;

    $scope.auto = {};
    $scope.auto.sizing = "questions";
    $scope.auto.questions = 20;
    $scope.auto.order = "random";
    $scope.auto.selected = {};
    $scope.auto.selected.bible = [];
    $scope.auto.selected.commentary = [];

    if (passedTestId != null && passedTestId != "") {

      //init things so that they have a value before the return of the API call
      $scope.myTest = {};
      $scope.myTest.TestId = "";
      $scope.myTest.Title = "...";
      $scope.myTest.SubTitle = "...";
      $scope.myTest.Questions = [];

      $scope.chapters = [];
      $scope.commentary = [];

      $timeout(function() {
        var testPromise = null;

        var ss = PbeService.getSelectedTest();
        if (ss == null || ss.TestId != passedTestId) {
          testPromise = PbeService.getTest(passedTestId).$promise;
          testPromise.then(function(test) {
            $scope.myTest = test;
          });
        }
        else if (ss != null && ss.TestId == passedTestId) {
          $scope.myTest = ss;
        }

        var questionsPromise = PbeService.getQuestions().$promise;
        questionsPromise.then(function(questionSet) {

          $scope.chapters = questionSet.chapters;
          $scope.commentary = questionSet.commentary;

          // make a map of all of the questions so that we can quickly look up by id
          $scope.questionIdMap = {};
          for (var i = 0; i < $scope.chapters.length; i++) {
            for (var j = 0; j < $scope.chapters[i].questions.length; j++) {
              $scope.questionIdMap[$scope.chapters[i].questions[j].id] = $scope.chapters[i].questions[j];
            }
          }

          for (var i = 0; i < $scope.commentary.length; i++) {
            for (var j = 0; j < $scope.commentary[i].questions.length; j++) {
              $scope.questionIdMap[$scope.commentary[i].questions[j].id] = $scope.commentary[i].questions[j];
            }
          }

          $scope.auto.selected.bible = new Array($scope.chapters.length);
          $scope.auto.selected.commentary = new Array($scope.commentary.length);
        });

        var allProms = [testPromise, questionsPromise];
        $q.all(allProms).then(function() {
          console.log("DONE LOADING TEST AND QUESTIONS...");

          // mark all selected questions... 
          // for (var i = 0; i < $scope.myTest.Questions.length; i++) {
          //   var qId = $scope.myTest.Questions[i].id;
          //   var breakback = false;

          //   for (var j = 0; j < $scope.chapters.length; j++) {
          //     for (var k = 0; k < $scope.chapters[j].questions.length; k++) {
          //       if ($scope.chapters[j].questions[k].id == qId) {
          //         $scope.chapters[j].questions[k].selected = true;
          //         breakback = true;
          //         break;
          //       }
          //     }
          //     if (breakback) {
          //       break;
          //     }
          //   }
          // }

          for (var i = 0; i < $scope.myTest.Questions.length; i++) {
            var qId = $scope.myTest.Questions[i].id;

            var q = $scope.questionIdMap[qId];
            if (typeof q != 'undefined' && q != null) {
              q.selected = true;
            }
          }

          console.log("DONE MARKING QUESTIONS.");


        }).finally(function() {
          // hide the indicator
          // setTimeout(function(){
          $("#chapter-progress").hide();
          // }, 500);

        });

      }, 250);



    }
    else {

      $scope.myTest = {};
      $scope.myTest.Title = "";
      $scope.myTest.SubTitle = "";
      $scope.myTest.Questions = [];


      $timeout(function() {
        var questionsPromise = PbeService.getQuestions().$promise;
        questionsPromise
          .then(function(questionSet) {

            $scope.chapters = questionSet.chapters;
            $scope.commentary = questionSet.commentary;
            $scope.auto.selected.bible = new Array($scope.chapters.length);
            $scope.auto.selected.commentary = new Array($scope.commentary.length);

            // hide the indicator
            // setTimeout(function(){
            $("#chapter-progress").hide();
            // }, 500);
          })
          .catch(function(err) {
            console.log(err);
          });

      });
    }


    $scope.handleChangeSelectAll = function(chapter) {

      var checked = chapter.selectAll;
      if (typeof checked == 'undefined') {
        checked = false;
      }

      if (typeof chapter !== 'undefined' && typeof chapter.questions !== 'undefined') {
        for (var i = 0; i < chapter.questions.length; i++) {
          chapter.questions[i].selected = checked;
        }
      }
    }


    $scope.handleAutoSelectAll = function(evt) {
      var checked = $scope.auto.selectAll;
      for (var i = 0; i < $scope.auto.selected.bible.length; i++) {
        $scope.auto.selected.bible[i] = checked;
      }
      for (var i = 0; i < $scope.auto.selected.commentary.length; i++) {
        $scope.auto.selected.commentary[i] = checked;
      }

    }

    $scope.autoGenerateQuestions = function(evt) {
      var confirm = $mdDialog.confirm()
        .title('Overwrite Questions?')
        .content('Any question selections that you have made manually for this test will be overwritten!  Are you sure that you want to continue?')
        .targetEvent(evt)
        .ok('OK')
        .cancel('Cancel');
      $mdDialog.show(confirm).then(function() {
        //console.log("selected chapters: "+$scope.auto.selected.bible);

        // loop through the selected chapters in the auto-select and then choose questions
        var autoSelectedChapters = [];
        for (var i = 0; i < $scope.auto.selected.bible.length; i++) {
          if ($scope.auto.selected.bible[i] == true) {
            autoSelectedChapters.push(i);
          }
        }

        var autoSelectedSections = [];
        for (var i = 0; i < $scope.auto.selected.commentary.length; i++) {
          if ($scope.auto.selected.commentary[i] == true) {
            autoSelectedSections.push(i);
          }
        }


        // if no chapters or commentary sections were selected, just return... nothing to do
        if (autoSelectedChapters.length == 0 && autoSelectedSections.length == 0) {
          return;
        }

        // clear out the questions on the test so that we can fill in with newly selected questions
        $scope.myTest.Questions = [];
        // clear out the tick marks on the UI
        for (var j = 0; j < $scope.chapters.length; j++) {
          for (var k = 0; k < $scope.chapters[j].questions.length; k++) {
            $scope.chapters[j].questions[k].selected = false;
          }
        }
        for (var j = 0; j < $scope.commentary.length; j++) {
          for (var k = 0; k < $scope.commentary[j].questions.length; k++) {
            $scope.commentary[j].questions[k].selected = false;
          }
        }


        var usedTable = {}; // used to track which questions have been used already
        var qCount = 0;
        var qLimit = $scope.auto.sizing == 'questions' ? $scope.auto.questions : 1;
        var pCount = 0;
        var pLimit = $scope.auto.sizing == 'points' ? $scope.auto.points : 1;

        // make sure that point and question count limits are sane...
        var qUpperLimit = 0;
        var pUpperLimit = 0;

        // place to keep the list of questions from which to choose randomly...
        var questionPool = [];

        for (var i = 0; i < autoSelectedChapters.length; i++) {
          for (var j = 0; j < $scope.chapters[autoSelectedChapters[i]].questions.length; j++) {
            qUpperLimit += 1;
            pUpperLimit += $scope.chapters[autoSelectedChapters[i]].questions[j].points;

            questionPool.push($scope.chapters[autoSelectedChapters[i]].questions[j]);
          }
        }
        for (var i = 0; i < autoSelectedSections.length; i++) {
          for (var j = 0; j < $scope.commentary[autoSelectedSections[i]].questions.length; j++) {
            qUpperLimit += 1;
            pUpperLimit += $scope.commentary[autoSelectedSections[i]].questions[j].points;

            questionPool.push($scope.commentary[autoSelectedSections[i]].questions[j]);

          }
        }
        if (qLimit > qUpperLimit) {
          qLimit = qUpperLimit;
        }
        if (pLimit > pUpperLimit) {
          pLimit = pUpperLimit;
        }


        // first randomly select a chapter
        while (qCount < qLimit && pCount < pLimit) {
          // var randChap = $scope.chapters[autoSelectedChapters[Math.floor(Math.random()*autoSelectedChapters.length)]];
          // var randQues = randChap.questions[Math.floor(Math.random()*randChap.questions.length)];
          var randQues = questionPool[Math.floor(Math.random() * questionPool.length)]
          if (typeof randQues == 'undefined' || typeof usedTable[randQues.id] != 'undefined') {
            continue;
          }
          usedTable[randQues.id] = randQues;
          $scope.myTest.Questions.push(randQues);

          // mark the UI for the question as selected
          randQues.selected = true;

          if ($scope.auto.sizing == 'questions') {
            qCount += 1;
          }
          else {
            pCount += randQues.points;
          }
        }

        console.log("Done auto-generating questions.  qCount: " + qCount + ", pCount: " + pCount);

        // switch back to the manual selection tab to show results...
        $scope.selectedTab = 0;

      }, function() {

        // DOH!  No error handling cause I'm lazy...
      });

    }

    $scope.cancel = function($event) {
      $state.go('tests');
    };

    $scope.save = function($event) {

      var testToSave = $scope.myTest;

      testToSave.Questions = [];

      // save the bible questions
      for (var j = 0; j < $scope.chapters.length; j++) {
        for (var k = 0; k < $scope.chapters[j].questions.length; k++) {
          if ($scope.chapters[j].questions[k].selected) {
            testToSave.Questions.push($scope.chapters[j].questions[k]);
          }
        }
      }

      // save the commentary questions
      for (var j = 0; j < $scope.commentary.length; j++) {
        for (var k = 0; k < $scope.commentary[j].questions.length; k++) {
          if ($scope.commentary[j].questions[k].selected) {
            testToSave.Questions.push($scope.commentary[j].questions[k]);
          }
        }
      }

      var savePromise = PbeService.saveTest(testToSave);
      savePromise.then(function(returnData) {
          console.log(returnData);

          PbeService.invalidateSelectedTest();
          PbeService.invalidateTestList();

          PbeService.setSelectedTestId(testToSave.TestId);

          $state.go('tests');
        })
        .catch(function(err) {
          console.log(err);
        });


    }

  });


  app.controller("ScoreController", function($scope, $state, $q, $stateParams, $timeout, PbeService){
    
    // warn the user that they are about to abandon the score
    $scope.$on('$stateChangeStart', function( event ) {
      var answer = confirm("Are you sure that you want to discard this scoring session?")
      if (!answer) {
          event.preventDefault();
      }
    });
    
  
    var passedTestId = $stateParams.testId;
    
    $scope.score = {};
    $scope.score.currentQuestionNumber = 0;
    $scope.score.questions = [];
    $scope.score.teams=new Array(2);
    $scope.score.teams[0] = {};
    $scope.score.teams[0].tally=[-1];
    $scope.score.teams[1] = {};
    $scope.score.teams[1].tally=[-1];
    
    


    if (passedTestId != null && passedTestId != "") {

      //init things so that they have a value before the return of the API call
      $scope.myTest = {};
      $scope.myTest.TestId = "";
      $scope.myTest.Title = "...";
      $scope.myTest.SubTitle = "...";
      $scope.myTest.Questions = [];


      $timeout(function() {
        var testPromise = null;

        var ss = PbeService.getSelectedTest();
        if (ss == null || ss.TestId != passedTestId) {
          testPromise = PbeService.getTest(passedTestId).$promise;
          testPromise.then(function(test) {
            $scope.myTest = test;
            
            $scope.score.questions = $scope.myTest.Questions;
            $scope.score.teams[0].tally = new Array($scope.myTest.Questions.length);
            $scope.score.teams[1].tally = new Array($scope.myTest.Questions.length);

            for(var i=1; i<$scope.myTest.Questions.length; i++){
              $scope.score.teams[0].tally[i] = -1;
              $scope.score.teams[1].tally[i] = -1;
              
            }
            
            randomizeQs();
            
          });
        }
        else if (ss != null && ss.TestId == passedTestId) {
          $scope.myTest = ss;
          $scope.score.questions = $scope.myTest.Questions;

          $scope.score.teams[0].tally = new Array($scope.myTest.Questions.length);
          $scope.score.teams[1].tally = new Array($scope.myTest.Questions.length);

          for(var i=1; i<$scope.myTest.Questions.length; i++){
            $scope.score.teams[0].tally[i] = -1;
            $scope.score.teams[1].tally[i] = -1;
            
          }
          
          randomizeQs();
        }
        
        
        function randomizeQs() {
          // randomly organize the questions (in the same order that's used in the test presentation)
  	    	var localRng = new Math.seedrandom('pbe');
  	    	var randQs = [];
  				while ($scope.score.questions.length > 0) {
  					var i = Math.floor(localRng() * $scope.score.questions.length);
  					var q = $scope.score.questions[i];
  					$scope.score.questions.splice(i, 1);
  					randQs.push(q);
          }
          $scope.score.questions = randQs;
  
          // set the first question scores
          $scope.score.teams[0].tally[0] = $scope.score.questions[0].points;
          $scope.score.teams[1].tally[0] = $scope.score.questions[0].points;
        }
        


      }, 250);
    }
  
    $scope.rotateScore = function(team){
      if($scope.score.teams[team].tally[$scope.score.currentQuestionNumber] == -1){
        $scope.score.teams[team].tally[$scope.score.currentQuestionNumber] = $scope.score.questions[$scope.score.currentQuestionNumber].points;
      }
      
      $scope.score.teams[team].tally[$scope.score.currentQuestionNumber]--;
      
      if($scope.score.teams[team].tally[$scope.score.currentQuestionNumber] < 0){
        $scope.score.teams[team].tally[$scope.score.currentQuestionNumber] = $scope.score.questions[$scope.score.currentQuestionNumber].points;
      }
    }
    
    $scope.nextQuestion = function(){
      $scope.score.currentQuestionNumber++;
      if($scope.score.currentQuestionNumber >= $scope.score.questions.length){
        $scope.score.currentQuestionNumber = $scope.score.questions.length-1;
      }
      
      if($scope.score.teams[0].tally[$scope.score.currentQuestionNumber] == -1){
        $scope.score.teams[0].tally[$scope.score.currentQuestionNumber] = $scope.score.questions[$scope.score.currentQuestionNumber].points;
      }
      if($scope.score.teams[1].tally[$scope.score.currentQuestionNumber] == -1){
        $scope.score.teams[1].tally[$scope.score.currentQuestionNumber] = $scope.score.questions[$scope.score.currentQuestionNumber].points;
      }
    }

    $scope.previousQuestion = function(){
      $scope.score.currentQuestionNumber--;
      if($scope.score.currentQuestionNumber < 0){
        $scope.score.currentQuestionNumber = 0;
      }

      if($scope.score.teams[0].tally[$scope.score.currentQuestionNumber] == -1){
        $scope.score.teams[0].tally[$scope.score.currentQuestionNumber] = $scope.score.questions[$scope.score.currentQuestionNumber].points;
      }
      if($scope.score.teams[1].tally[$scope.score.currentQuestionNumber] == -1){
        $scope.score.teams[1].tally[$scope.score.currentQuestionNumber] = $scope.score.questions[$scope.score.currentQuestionNumber].points;
      }


    }
    
    $scope.selectQuestion = function(ind){
      $scope.score.currentQuestionNumber = ind;
      
      if($scope.score.teams[0].tally[$scope.score.currentQuestionNumber] == -1){
        $scope.score.teams[0].tally[$scope.score.currentQuestionNumber] = $scope.score.questions[$scope.score.currentQuestionNumber].points;
      }
      if($scope.score.teams[1].tally[$scope.score.currentQuestionNumber] == -1){
        $scope.score.teams[1].tally[$scope.score.currentQuestionNumber] = $scope.score.questions[$scope.score.currentQuestionNumber].points;
      }

    }

    $scope.calculatePercentage = function(team){
      
      var t = $scope.score.teams[team].tally;
      var totalPoints = 0;
      var scoredPoints = 0;
      
      for(var i=0;i<t.length;i++){
        if(t[i] != -1){
          totalPoints += $scope.score.questions[i].points
          scoredPoints += t[i];
        }
      }
      
      if(totalPoints != 0){
        return +((Math.round(scoredPoints/totalPoints*10000)/10000)*100).toFixed(2);
      } else {
        return 0;
      }
      
    }
    
    $scope.postScore = function(){
      PbeService.postScore($scope.myTest.TestId, $scope.score.teams, $scope.score.questions);
    }


  });

  // app.controller("FooController", function($scope, $state, $q, $stateParams, $cacheFactory, PbeTests, PbeQuestions) {});


})();