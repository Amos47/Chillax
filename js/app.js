angular.module('ChillaxApp', [])
    .controller('ChillaxController', ['$scope', 'settings', 'Sounds', 'NotificationSystem', 
    function($scope, settings, Sounds, NotificationSystem) {
        $scope.settings = settings;
        $scope.sounds = Sounds;
        $scope.ns = NotificationSystem;
        // init function
        $scope.init = function() {
            //need to load settings first
            settings.onLoad(function(){
                //any time we update settings in this contoller we want to save them.
                $scope.$watchCollection('settings', function(newVal, oldVal){
                    settings.save(); // save function available from service.
                });
                //start the timer if they already had it active last time.
                if(settings.enabled){
                    $scope.ns.startTimer();
                    $scope.$apply();
                }
            });

        };

        $scope.playSound = function() {
            Sounds.play(settings.sound);
        };
    }]).factory('settings',  ['$rootScope', function($rootScope) {
        var loadListners = [];
        var settings;
        // deafault settings.
        settings = {
            enabled : false,
            reminderInterval : 90,
            breakInterval : 10,
            sound : 'Ding Dong'
        };

        function loaded(){
            for(var i = 0; i < loadListners.length; ++i){
                loadListners[i]();
            }
        }

        settings.onLoad = function(func){
            loadListners.push(func);
        }

        //load settings
        console.log('about to load');

        chrome.storage.sync.get(settings, function(obj) {
            console.log('Settings loaded: ' + obj['reminderInterval']);
            angular.extend(settings, obj);
            $rootScope.$apply(); // hate to apply but once on load isn't bad.
            loaded();
        });
        //save whenever anything changes.
        settings.save = function() {
            console.log('Attempting to auto save the settings');
            // create a new object without the save or onLoad function.
            // we don't want to remove the functions from the settings object currently in use by the app.
            var s = angular.extend({}, settings, {save: undefined, onLoad: undefined});
            //save to storage
            chrome.storage.sync.set(s, function() {
                console.log('Settings have been stored successfully');
            });

        };
        // return the settings object as the service
        return settings;
    }]).factory('Sounds', [ function(){
        //This is the map from a user readable key to a url for that sound.
        var srcMap = {
            'Ding Dong' : 'audio/dingdong.wav',
            'Cha Ching' : 'audio/cash-register.mp3',
            'Church Bells' : 'audio/church-bells.wav',
            'Crystal Chime' : 'audio/crystal-glass.wav',
            'IM Message' : 'audio/notification-chime.wav',
            'Whip' : 'audio/whip-crack-01.wav'
        };
        // create the sounds object to return
        var sounds = {};
        // list of keys for sounds
        sounds.list = Object.keys(srcMap);
        //play is given a key from the list and plays audio.
        sounds.play = function(key){
            if(!key || !srcMap[key]){
                return alert('Must choose a valid sound');
            }
            var a = new Audio();
            a.src = srcMap[key];
            a.play();
        };
        //return the sounds service
        return sounds;
    }]).factory('NotificationSystem', ['settings', 'Sounds', '$rootScope' ,function(settings, Sounds, $rootScope){
        var isRunning = false;
        var notify = function(message){
                console.log('Playing sound : ', settings.sound);
            if(settings.sound){
                Sounds.play(settings.sound);
            } 
            var notification = new Notification(message, {
                icon : 'chillax-128.png'
            });
        }
        // Chain of timers
        var workTimer, chillTimer; // These are here to keep reference of the inteval objects 
        function startWorkTimer(){
            workTimer = setTimeout(completeWorkTimer, settings.reminderInterval * 60 * 1000);
            ns.nextNotification = "Chilax at : " + moment().add(settings.reminderInterval, 'm').format('hh:mma');
        };
        function completeWorkTimer(){
            notify('Time to Chillax!', settings.sound);
            startChillTimer();
        };
        function startChillTimer(){
            chillTimer = setTimeout(completeChillTimer, settings.breakInterval * 60 * 1000);
            ns.nextNotification = "Back to work at : " + moment().add(settings.breakInterval, 'm').format('hh:mma');
        };
        function completeChillTimer(){
            notify('Back to work', 'Whip');
            startWorkTimer();
        };

        // notification service
        var ns = {}; 
        ns.nextNotification = "Miceal Gallagher"; //default
        ns.startTimer = function(){
            console.log('starting timer');
            if(isRunning){  return; }
            startWorkTimer();
            isRunning = true;
        };
        ns.clearTimer = function(){
            console.log('clearing timers');
            if(!isRunning){ return; }
            //clear timeout on untruthy value is ok
            clearTimeout(workTimer);
            clearTimeout(chillTimer);
            ns.nextNotification = "Miceal Gallagher";
            isRunning = false;
        }
        ns.reset = function(){
            if(isRunning){
                ns.clearTimer();
                ns.stopTimer();
            }
        }
        ns.toggleTimer = function(){
            if(isRunning){
                ns.clearTimer();
            } else{
                ns.startTimer();
            }
        }
        return ns;
    }]);