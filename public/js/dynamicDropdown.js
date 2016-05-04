var created = 0;

function displayAccordingly() {
  if (created === 1) {
      removeDrop();
  }

  //Call mainMenu the main dropdown menu
  var scope = document.getElementById('scope');

  //Create the new dropdown menu
  var whereToPut = document.getElementById('myDiv');
  var newDropdown = document.createElement('select');
  newDropdown.setAttribute('id',"newDropdownMenu");
  whereToPut.appendChild(newDropdown);

  if (scope.value === 'International') { //The person chose International
    for (var i = 0; i < intl.length; i++) {
      //Add an option
      var option=document.createElement("option");
      option.text= intl[i];
      newDropdown.add(option,newDropdown.options[null]);
    }

  } else if (scope.value === 'Domestic') { //The person chose Domestic
    for (var i = 0; i < locals.length; i++) {
      //Add an option
      var option=document.createElement("option");
      option.text= locals[i];
      newDropdown.add(option,newDropdown.options[null]);
    }

  }

  created = 1
}

function removeDrop() {
    var d = document.getElementById('myDiv');
    var oldmenu = document.getElementById('newDropdownMenu');
    d.removeChild(oldmenu);
}
