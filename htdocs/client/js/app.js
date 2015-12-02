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
      .state('foo', {
        url: '/foo/:fooId',
        templateUrl: 'partials/foo.html',
        controller: 'FooController'
      })

  }]);

  app.controller('MainAppController', ['$scope', '$state', '$mdBottomSheet', '$mdSidenav', '$mdDialog', 'PbeTests', function($scope, $state, $mdBottomSheet, $mdSidenav, $mdDialog, PbeTests) {

    $scope.activity = "";

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




  app.controller("TestController", function($scope, $state, PbeService) {

    $scope.$parent.selectedTestId = "";

    $scope.tests = PbeService.getTests().$promise.then(function(tests) {
      $scope.tests = tests;
    });

    $scope.getStoryCount = function() {
      return $scope.tests.count;
    }

    $scope.handleMenuClick = function(menu, testId) {
      if (menu == "Edit") {

        $scope.editTest(testId);
      }

      else if (menu == "Delete") {
        $scope.deleteTest(testId);
      }

      else if (menu == "Foo") {
        $state.go("foo", {
          "fooId": 1
        });
      }

    }

    $scope.presentTest = function(testId) {
      window.open("/slides?id=" + testId, "_blank");
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

    $scope.deleteTest = function(testId) {
      PbeService.deleteTest(testId);
      PbeService.invalidateTestList();
      $state.go($state.current, {}, {
        reload: true
      });

    }


  });


  app.controller("TestEditController", function($scope, $state, $q, $stateParams, $cacheFactory, $timeout, $mdDialog, PbeService) {

    var passedTestId = $stateParams.testId;

    $scope.auto = {};
    $scope.auto.sizing = "questions";
    $scope.auto.questions = 20;
    $scope.auto.order = "linear";
    $scope.auto.content = [];

    if (passedTestId != null && passedTestId != "") {

      //init things so that they have a value before the return of the API call
      $scope.myTest = {};
      $scope.myTest.TestId = "";
      $scope.myTest.Title = "...";
      $scope.myTest.SubTitle = "...";
      $scope.myTest.Questions = [];

      $scope.chapters = [];

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
        });

        var allProms = [testPromise, questionsPromise];
        $q.all(allProms).then(function() {
          console.log("DONE LOADING TEST AND QUESTIONS...");

          // mark all selected questions... 
          for (var i = 0; i < $scope.myTest.Questions.length; i++) {
            var qId = $scope.myTest.Questions[i].id;
            var breakback = false;

            for (var j = 0; j < $scope.chapters.length; j++) {
              for (var k = 0; k < $scope.chapters[j].questions.length; k++) {
                if ($scope.chapters[j].questions[k].id == qId) {
                  $scope.chapters[j].questions[k].selected = true;
                  breakback = true;
                  break;
                }
              }
              if (breakback) {
                break;
              }
            }
          }

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

    $scope.autoGenerateQuestions = function(evt) {
      var confirm = $mdDialog.confirm()
        .title('Overwrite Questions?')
        .content('Any custom questions that you have selected will be overwritten!  Are you sure that you want to continue?')
        .targetEvent(evt)
        .ok('OK')
        .cancel('Cancel');
      $mdDialog.show(confirm).then(function() {
      }, function() {
      });

    }

    $scope.cancel = function($event) {
      $state.go('tests');
    };

    $scope.save = function($event) {

      var testToSave = $scope.myTest;

      testToSave.Questions = [];

      for (var j = 0; j < $scope.chapters.length; j++) {
        for (var k = 0; k < $scope.chapters[j].questions.length; k++) {
          if ($scope.chapters[j].questions[k].selected) {
            testToSave.Questions.push($scope.chapters[j].questions[k]);
          }
        }
      }

      // var testToSave = new PbeTests();
      // testToSave.TestId = $scope.myTest.TestId;
      // testToSave.Title = $scope.myTest.Title;
      // testToSave.SubTitle = $scope.myTest.SubTitle;
      // testToSave.Questions = $scope.myTest.Questions;

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


  app.controller("FooController", function($scope, $state, $q, $stateParams, $cacheFactory, PbeTests, PbeQuestions) {});


})();