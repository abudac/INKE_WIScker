/*	*************************************************************************************************
 *	Created by Andrea Budac at the University of Alberta
 *	Created under the INKE project and Dr. Rockwell and Dr. Ruecker
 *	Original idea by Robert Budac
 *	Contributors: Andrea Budac, Geoffrey Rockwell, Zachary Palmer, Robert Budac, Stan Ruecker
 *	*************************************************************************************************
 *	WIScker (Wikipedia Idea Scraper) is a tool for scraping old revisions of Wikipedia articles.
 *	The corpus resulting from the scrape is then available to the user to analyze as they see fit.
 *	
 *	Copyright (C) 2014-2015  Andrea Budac and INKE
 *	
 *	This program is free software: you can redistribute it and/or modify
 *	it under the terms of the GNU General Public License as published by
 *	the Free Software Foundation, either version 3 of the License, or
 *	(at your option) any later version.
 *	
 *	This program is distributed in the hope that it will be useful,
 *	but WITHOUT ANY WARRANTY; without even the implied warranty of
 *	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *	GNU General Public License for more details.
 *	
 *	You should have received a copy of the GNU General Public License
 *	along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *	*************************************************************************************************
 */

/*
 *	Load Datepickers, slide panels and popovers when ready
 *	Reset forms for editing
 */
$(document).ready(function () {
	//Re-enable any disabled form elements and disable submit button
	enableForm();

	// Reset the form
	$("#wikiForm").trigger('reset');

	// Empty the output section
	$('#printOutHere').text('');
	// Disable the select output text button
	$('#selectTextButton').prop('disabled', true);
	// Enable reset button
	$('#resetButton').prop('disabled', false);

	// Reset preview to Wikipedia main page
	$('#previewFrame').prop('src', $('#wikiAddress').prop('placeholder') );

	// Reset all error messages
	$('.has-error').removeClass('has-error');

	/*	
	 *	Initialize datepickers with proper date format, initial view of the current year,
	 *	make them hide on selection, don't forcibly parse the user's input, and add a clear button to the bottom
	 *	Wikipedia started on January 15, 2001, so restrict start date to this day
	 *	"+0d" prevents users from selecting days after today
	 *	Also validate the given info when the date is changed or the datepicker is hidden
	 */ 
	$('#startDate').datepicker( {
		format: "yyyy/mm/dd",
		startView: "year",
		autoclose: true,
		forceParse: false,
		clearBtn: true,
		endDate: "+0d",
		startDate: "2001/01/15"
	}).on('changeDate', function(e){
		validateInfo();
	}).on('hide', function(e){
		validateInfo();
	});

	$('#endDate').datepicker( {
		format: "yyyy/mm/dd",
		startView: "year",
		autoclose: true,
		forceParse: false,
		clearBtn: true,
		endDate: "+0d",
		startDate: "2001/01/15"
	}).on('changeDate', function(e){
		validateInfo();
	}).on('hide', function(e){
		validateInfo();
	});

	// Initialize slide panels with custom transition time
	$("#aboutInfo").click( function() {
		$("#aboutPanel").slideToggle(460);
		$("#helpPanel").slideUp(460);
		$("#questionsPanel").slideUp(460);
	});
	$("#helpInfo").click( function() {
		$("#helpPanel").slideToggle(460);
		$("#aboutPanel").slideUp(460);
		$("#questionsPanel").slideUp(460);
	});
	$("#questionsInfo").click( function() {
		$("#questionsPanel").slideToggle(460);
		$("#aboutPanel").slideUp(460);
		$("#helpPanel").slideUp(460);
	});

	// Initialize form slide panels with custom transition time
	$("#scrapeTypeRadio1").click( function() {
		$("#datePanel").slideDown(460);
		$("#frequencyPanel").slideUp(460);
	});
	$("#scrapeTypeRadio2").click( function() {
		$("#frequencyPanel").slideDown(460);
		$("#datePanel").slideUp(460);
	});

	// Inititalize popovers with no content
	$('#wikiAddress').popover( {
		placement: "right",
		trigger: "focus hover",
		container: "body"
	});
	$('#startDate').popover( {
		placement: "right",
		trigger: "focus hover",
		container: "body"
	});
	$('#endDate').popover( {
		placement: "right",
		trigger: "focus hover",
		container: "body"
	});
});


/*
 *	Function that closes the error alert (id="errorOutputAlert") when the x button is pressed
 *	Allows the same alert to be used for all of the errors
 */
$(function() {
	$(document).on('click', '.alert-close', function() {
		$(this).parent().slideUp(460);
	})
});


/*
 *	When the submit button (id = submitButton) is clicked
 *	grab all the given info
 */
function wikiScrapeGo()
{
	// check if info is valid
	if ( !(validateInfo()) ) {
		sendError("Data entered is not valid.");
		return;
	}
	// Grab the full Address
	var getAddress = $('#wikiAddress').val();
	// Grab the dates
	var getStartDate = $('#startDate').val();
	var getEndDate = $('#endDate').val();

	// Disable the form to prevent retrieval errors
	disableForm();
	// Reset the progress bars to 0%
	$('#progressBarAll').width('0%');
	$('#progressBarContent').width('0%');
	// Show the progress bar
	$("#progressBarAllWrapper").slideDown(460);

	// Check scrape type 
	if ( $('.scrapeTypeRadio:checked').val() == "dateSelected")
	{
		// Grab the interval data
		var getIntervalDate = $('#oftenDate').val();
		
		findFirstRevision(getStartDate, getEndDate, getIntervalDate, getAddress, "date");
	}
	else if ( $('.scrapeTypeRadio:checked').val() == "frequencySelected")
	{
		// Grab the wanted frequency
		var getFrequency = $('#frequentDate').val();

		findFirstRevision(getStartDate, getEndDate, getFrequency, getAddress, "frequency");
	}
	else
	{
		sendError("Unknown scrape type selected.");
		return;
	}
}


/*
 *	Called from wikiScrapeGo()
 *	Concat the address using the date and parse the resulting data
 *	Once have the info, send requests to Wikipedia to find first wanted revision
 */
function findFirstRevision(getStartDate, getEndDate, getInterval, getAddress, scrapeType)
{
	// Set local timeout in miliseconds
	var localTimeout = 60000;

	// Given a string in the format: 2014/11/26, parse and store as a date object
	// Subtract 1 off of month, since month counting starts at zero
	var startDateObj = new Date( getStartDate.substring(0, 4),
			(getStartDate.substring(5, 7) - 1), getStartDate.substring(8, 10) );
	var endDateObj = new Date( getEndDate.substring(0, 4),
			(getEndDate.substring(5, 7) - 1), getEndDate.substring(8, 10) );


	// Build variable for finding the wanted revision
	// Remove the '/' from the raw dates: assuming format of yyyy/mm/dd
	var rawStartDate = getStartDate.replace(/\//g, '');
	var rawEndDate = getEndDate.replace(/\//g, '');
	// Add six zeros on the end
	rawStartDate += "000000";
	rawEndDate += "000000";
	// Combine dates and API info
	var firsRevisionInfo = "rvlimit=2&rvdir=newer&rvprop=ids|timestamp&rvstart=" + rawStartDate + "&rvend=" + rawEndDate + "&titles=";

	// If the wanted frequency is under 7 days or under every 7th revision
	if (getInterval < 7)
	{
		// Parse the wikiAddresses together with content
		var fullWikiAddress = parseAddress( getAddress, firsRevisionInfo);
		// Using start date of Wikipedia, combined with the limit of 1 and rvdir=newer, will get the first revision
		var findFirstWikiAddress = parseAddress( getAddress, "rvlimit=1&rvdir=newer&rvprop=ids|timestamp|user|content&" +
							"rvstart=20010115000000&titles=");
		// Wikipedia API will return latest revision when no info given
		var findLastWikiAddress = parseAddress( getAddress, "rvlimit=1&rvprop=ids|timestamp|user|content&titles=");
	}
	else {
		// Show the secondary progress bar
		$("#progressBarContentWrapper").slideDown(460);
		// Parse the wikiAddresses together with no content
		var fullWikiAddress = parseAddress( getAddress, firsRevisionInfo);
		// Using start date of Wikipedia, combined with the limit of 1 and rvdir=newer, will get the first revision
		var findFirstWikiAddress = parseAddress( getAddress, "rvlimit=1&rvdir=newer&rvprop=ids|timestamp&rvstart=20010115000000&titles=");
		// Wikipedia API will return latest revision when no info given
		var findLastWikiAddress = parseAddress( getAddress, "rvlimit=1&rvprop=ids|timestamp&titles=");
	}

	// Get JSON object from given data: Find the first revision for the given article
	$.ajax({
		dataType: "json",
		type: "GET",
		url: findFirstWikiAddress,
		timeout: localTimeout
	}).then ( function(data)
	{
		// Check if the data we expect exists
		if (data && data.query && data.query.pages) {
			// Cut through the nested json object	
			var pages = data.query.pages;
		}
		else {
			// ERROR. No pages returned.
			sendError("Wikipedia article was not found the first time.");
			return;
		}
		// Loop over the one property of data.query.pages
		for (var id in pages)
		{
			if (pages[id].revisions && pages[id].revisions[0] && pages[id].revisions[0]["revid"])
			{
				var firstRevisionTime = pages[id].revisions[0]["timestamp"];

				// Change the timestamp of the first revision to date format
				// Given a string in the format: 2014-11-26..., parse and store as a date object
				var firstRevisionDate = new Date( pages[id].revisions[0]["timestamp"].substring(0, 4),
							(pages[id].revisions[0]["timestamp"].substring(5, 7) - 1),
								pages[id].revisions[0]["timestamp"].substring(8, 10) );

				// Check if the first revision we found has a parent id of 0
				// Some articles do not have a first revision with a parent id of 0
				// if(pages[id].revisions[0]["parentid"] != 0) { sendError("Special Error: First revision has a parent id."); }

				// Check if user entered a duration before the article existed
				if(firstRevisionDate > startDateObj && firstRevisionDate > endDateObj)
				{
					// If end date is before article creation: pass error
					sendError("Wikipedia article did not exist during this time. Try a later end date.");
					return;
				}
				// Check if user entered a start date before article existed
				else if (firstRevisionDate >= startDateObj)
				{
					// If article creation is after selected start date, then the first revision is the first one we want
					// Empty array for storing results
					var contentArray = new Array();
					// Fill array with initial revision's timestamp: timestamps are less prone to errors when using the Wikipedia API
					contentArray.push(pages[id].revisions[0]["timestamp"]);
					// Optimization: if more frequent request, get all content now
					if (getInterval < 7)
					{
						// Fill array with initial revision: Get content of current revision
						contentArray.push(pages[id].revisions[0]["user"]);
						contentArray.push(pages[id].revisions[0]["*"]);
					}

					if(scrapeType == "date")
					{
						// Use the date of the first revision to prevent grabbing the first revision multiple times
						// Calculate the next interval of time: Get the total miliseconds of the revision date
						var startMiliSec = Date.parse(firstRevisionDate);
						// Use those to calculate the next time we want to grab a revision
						startMiliSec = startMiliSec + getMiliseconds(getInterval);
						var calcDate = new Date();
						calcDate.setTime(startMiliSec);
					}
					else if (scrapeType == "frequency")
					{
						var calcDate = new Date();
						calcDate.setTime( Date.parse(firstRevisionDate) );
					}
					else
					{
						// ERROR. Unknown Scrape Type entered. Should never reach this error.
						sendError("Unknown scrape type when searching for first revision.");
						return;
					}
					// Go to recursive funtion with initial data
					findNextRevision( firstRevisionTime, getInterval, getAddress, calcDate, endDateObj, contentArray, scrapeType);
				}
				else {
					/*	
					 *	If article creation is before selected start date, then the first
					 *	revision is either a specific revision, or the last one
					 */
					// Get JSON object from given data: Find the last revision for the given article
					$.ajax({
						dataType: "json",
						type: "GET",
						url: findLastWikiAddress,
						timeout: localTimeout
					}).then ( function(data)
					{
						// Check if the data we expect exists
						if (data && data.query && data.query.pages) {
							// Cut through the nested json object
							var pages = data.query.pages;
						}
						else {
							// ERROR. No pages returned.
							sendError("Wikipedia article was not found a second time.");
							return;
						}
						// Loop over the one property of data.query.pages
						for (var id in pages)
						{
							if (pages[id].revisions && pages[id].revisions[0] && pages[id].revisions[0]["revid"])
							{
								var lastRevisionTime = pages[id].revisions[0]["timestamp"];

								// Change the timestamp of the last revision to date format
								// Given a string in the format: 2014-11-26..., parse and store as a date object
								var lastRevisionDate = new Date( pages[id].revisions[0]["timestamp"].substring(0, 4),
											(pages[id].revisions[0]["timestamp"].substring(5, 7) - 1),
												pages[id].revisions[0]["timestamp"].substring(8, 10) );

								// Check if user entered a start date after the last revision
								if (startDateObj >= lastRevisionDate)
								{
									/*	If last revision occured before selected start date, the last revision is the one we want */
									if (scrapeType == "date")
									{
										// Empty array for storing results
										var contentArray = new Array();
										// Fill array with initial revision's timestamp
										contentArray.push(pages[id].revisions[0]["timestamp"]);
										// Optimization: if more frequent request, get all content now
										if (getInterval < 7)
										{
											// Fill array with initial revision: Get content of current revision
											contentArray.push(pages[id].revisions[0]["user"]);
											contentArray.push(pages[id].revisions[0]["*"]);
										}

										// Calculate the next interval of time: Get the total miliseconds of the start date
										var startMiliSec = Date.parse(startDateObj);
										// Use those to calculate the next time we want to grab a revision
										startMiliSec = startMiliSec + getMiliseconds(getInterval);
										var calcDate = new Date();
										calcDate.setTime(startMiliSec);
									}
									else if (scrapeType == "frequency")
									{
										// No revisions were made during the given time period
										sendError("No revisions were made during this time period. Try expanding the duration.");
										return;
									}
									else
									{
										// ERROR. Unknown Scrape Type entered. Should never reach this error.
										sendError("Unknown scrape type when searching for last revision.");
										return;
									}
									// Go to recursive funtion with initial data
									findNextRevision( lastRevisionTime, getInterval, getAddress, calcDate, endDateObj, contentArray, scrapeType);
								}
								else {
									/*	
									 *	If last article revision is after selected start date, then the first
									 *	revision is a specific revision
									 */
									// Get JSON object from given data
									$.ajax({
										dataType: "json",
										type: "GET",
										url: fullWikiAddress,
										timeout: localTimeout
									}).then ( function(data)
									{
										// Check if the data we expect exists
										if (data && data.query && data.query.pages) {
											// Cut through the nested json object
											var pages = data.query.pages;
										}
										else {
											// ERROR. No pages returned.
											sendError("Wikipedia article was not found.");
											return;
										}
										// Loop over the one property of data.query.pages
										for (var id in pages)
										{
											if (pages[id].revisions && pages[id].revisions[0] && pages[id].revisions[0]["revid"])
											{
												// Store specific revision's data for later use in next ajax call
												var revTimeFirst = pages[id].revisions[0]["timestamp"];
												var revIdFirst = pages[id].revisions[0]["revid"];
												// Optimization: if more frequent request, also get content now
												if (getInterval < 7)
												{
													var revUserFirst = pages[id].revisions[0]["user"];
													var revContentFirst = pages[id].revisions[0]["*"];
												}

												// Change the timestamp of the specific revision to date format
												// Given a string in the format: 2014-11-26..., parse and store as a date object
												var specificRevisionDate = new Date( pages[id].revisions[0]["timestamp"].substring(0, 4),
															(pages[id].revisions[0]["timestamp"].substring(5, 7) - 1),
																pages[id].revisions[0]["timestamp"].substring(8, 10) );

												/*	
												 *	If the first revision after the start time does not have a parent,
												 *	use that revision as the "first" (should never happen)
												 */
												if (pages[id].revisions[0]["parentid"] == 0)
												{
													// Empty array for storing results
													var contentArray = new Array();
													// Fill array with initial revision's timestamp
													contentArray.push(revTimeFirst);
													// Optimization: if more frequent request, get all content now
													if (getInterval < 7)
													{
														// Fill array with initial revision: Get content of current revision
														contentArray.push(revUserFirst);
														contentArray.push(revContentFirst);
													}

													if (scrapeType == "date")
													{
														// Calculate the next interval of time: Get the total miliseconds of the start date
														var startMiliSec = Date.parse(startDateObj);
														// Use those to calculate the next time we want to grab a revision
														startMiliSec = startMiliSec + getMiliseconds(getInterval);
														var calcDate = new Date();
														calcDate.setTime(startMiliSec);
													}
													else if (scrapeType == "frequency")
													{
														var calcDate = new Date();
														calcDate.setTime( Date.parse(specificRevisionDate) );
													}
													else
													{
														// ERROR. Unknown Scrape Type entered. Should never reach this error.
														sendError("Unknown scrape type when searching for first revision that should not exist.");
														return;
													}
													// Go to recursive funtion with initial data
													findNextRevision( revTimeFirst, getInterval, getAddress, calcDate,
															endDateObj, contentArray, scrapeType);
												}
												else {
													/*
													 *	Requests the id and timestamp of the revisions
													 *	[0] - specific revision, [1] - parent of specific revision
													 *	Uses a limit of 2, as that is all that is needed
													 *	Uses the default of listing newest revisions first
													 */
													if (getInterval < 7)
													{
														var specificRequest = "rvlimit=2&rvprop=ids|timestamp|user|content&rvstartid="
																			+ revIdFirst + "&titles=";
														var parentWikiAddress = parseAddress(getAddress, specificRequest);
													}
													else
													{
														var specificRequest = "rvlimit=2&rvprop=ids|timestamp&rvstartid="
																			+ revIdFirst + "&titles=";
														var parentWikiAddress = parseAddress(getAddress, specificRequest);
													}
													/*	
													 *	Need to find the parent of the specific revision, since that is the one we want
													 *	Parent of the specific revision was the version of the article on the day we want
													 */
													// Get JSON object from given data
													$.ajax({
														dataType: "json",
														type: "GET",
														url: parentWikiAddress, 
														timeout: localTimeout
													}).then ( function(data)
													{
														// Check if the data we expect exists
														if (data && data.query && data.query.pages) {
															// Cut through the nested json object
															var pages = data.query.pages;
														}
														else {
															// ERROR. No pages returned.
															sendError("Wikipedia article was not found when looking for parent.");
															return;
														}
														// Loop over the one property of data.query.pages
														for (var id in pages)
														{
															if (pages[id].revisions && pages[id].revisions[1] && pages[id].revisions[1]["revid"])
															{
																var parentRevisionTime = pages[id].revisions[1]["timestamp"];

																// Change the timestamp of the parent revision to date format
																// Given a string in the format: 2014-11-26..., parse and store as a date object
																var parentRevisionDate = new Date(
																		pages[id].revisions[1]["timestamp"].substring(0, 4),
																			(pages[id].revisions[1]["timestamp"].substring(5, 7) - 1),
																				pages[id].revisions[1]["timestamp"].substring(8, 10) );

																// Calculate the milliseconds of all the date objects for comparison
																var startMiliSec = Date.parse(startDateObj);
																var parentMiliSec = Date.parse(parentRevisionDate);
																var specificMiliSec = Date.parse(specificRevisionDate);

																/*
																 *	If parent revision timestamp is before both start date and
																 *	specific revision timestamp, use parent as first revision
																 *	Also check if the child of this ajax call is the same as the
																 *		specific revision above. If it is not, go with specific revision
																 */
																if( (parentMiliSec < startMiliSec) && (parentMiliSec < specificMiliSec)
																	&& (revIdFirst == pages[id].revisions[0]["revid"]) )
																{
																	// Empty array for storing results
																	var contentArray = new Array();
																	// Fill array with parent revision's timestamp
																	contentArray.push(pages[id].revisions[1]["timestamp"]);
																	// Optimization: if more frequent request, get all content now
																	if (getInterval < 7)
																	{
																		// Fill array with initial revision: Get content of current revision
																		contentArray.push(pages[id].revisions[1]["user"]);
																		contentArray.push(pages[id].revisions[1]["*"]);
																	}

																	if(scrapeType == "date")
																	{
																		// Calculate the next interval of time
																		// Use startMiliSec to calculate the next time we want to grab a revision
																		startMiliSec = startMiliSec + getMiliseconds(getInterval);
																		var calcDate = new Date();
																		calcDate.setTime(startMiliSec);
																	}
																	else if (scrapeType == "frequency")
																	{
																		var calcDate = new Date();
																		calcDate.setTime( Date.parse(parentRevisionDate) );
																	}
																	else
																	{
																		// ERROR. Unknown Scrape Type entered. Should never reach this error.
																		sendError("Unknown scrape type when searching for parent revision.");
																		return;
																	}
																	// Go to recursive funtion with initial data
																	findNextRevision( parentRevisionTime, getInterval, getAddress, calcDate,
																			endDateObj, contentArray, scrapeType);
																}
																// Use specific revision
																else
																{
																	// Empty array for storing results
																	var contentArray = new Array();
																	// Fill array with initial revision's timestamp
																	contentArray.push(revTimeFirst);
																	// Optimization: if more frequent request, get all content now
																	if (getInterval < 7)
																	{
																		// Fill array with initial revision: Get content of current revision
																		contentArray.push(revUserFirst);
																		contentArray.push(revContentFirst);
																	}

																	if (scrapeType == "date")
																	{
																		// Calculate the next interval of time:
																		// Use those to calculate the next time we want to grab a revision
																		startMiliSec = startMiliSec + getMiliseconds(getInterval);
																		var calcDate = new Date();
																		calcDate.setTime(startMiliSec);
																	}
																	else if (scrapeType == "frequency")
																	{
																		var calcDate = new Date();
																		calcDate.setTime( Date.parse(specificRevisionDate) );
																	}
																	else
																	{
																		// ERROR. Unknown Scrape Type entered. Should never reach this error.
																		sendError("Unknown scrape type when searching for specific revision.");
																		return;
																	}

																	// Go to recursive funtion with initial data
																	findNextRevision( revTimeFirst, getInterval, getAddress, calcDate,
																			endDateObj, contentArray, scrapeType);
																}
															}
															else {
																// ERROR. No revision content returned.
																sendError("No revisions were found when using the parentid.");
																return;
															}
														}
													}).fail( function(xmlhttprequest, textstatus, message)
													{
														if(textstatus == "timeout") {
															sendError("Fourth request to Wikipedia timed out.");
														} else {
															sendError(textstatus);
														}
													});
												}
											}
											else {
												// ERROR. No revision content returned.
												sendError("No revisions were found.");
												return;
											}
										}
									}).fail( function(xmlhttprequest, textstatus, message)
									{
										if(textstatus == "timeout") {
											sendError("Third request to Wikipedia timed out.");
										} else {
											sendError(textstatus);
										}
									});
								}
							}
							else {
								// ERROR. No revision content returned.
								sendError("No final revisions were found.");
								return;
							}
						}
					}).fail( function(xmlhttprequest, textstatus, message)
					{
						if(textstatus == "timeout") {
							sendError("Second request to Wikipedia timed out.");
						} else {
							sendError(textstatus);
						}
					});
				}
			}
			else {
				// ERROR. No revision content returned.
				sendError("No early revisions were found.");
				return;
			}
		}
	}).fail( function(xmlhttprequest, textstatus, message)
	{
		if(textstatus == "timeout") {
			sendError("First request to Wikipedia timed out.");
		} else {
			sendError(textstatus);
		}
	});
}


/*
 *	Called from findFirstRevision()
 *	Recursively find the next revision after the one given that satisfies the given interval of time
 *	Finds all the revisions and places them into an array
 */
function findNextRevision( revisionDate, intervalFreqency, gottenAddress, calcDate, endDate, contentArray, scrapeType)
{
	// Progress bar update
	updateProgressBar(calcDate, endDate);

	/*
	 *	Build the Url to scrape: 
	 *	Find the next entries, and grab the ones we need
	 *	Uses max limit, which is currently 50 when requesting content, 500 when not
	 */
	// Optimization: get full content if frequency is under 7
	if (intervalFreqency < 7)
	{
		// Parse the given date and remove all non-number characters
		// Assuming: "timestamp":"2002-01-08T07:10:59Z" format
		var specificRequest = "rvlimit=max&rvdir=newer&rvprop=ids|timestamp|user|content&rvstart=" +
						revisionDate.replace(/[^0-9]/g,'') + "&titles=";

		var wikiAddress = parseAddress(gottenAddress, specificRequest);
	}
	else
	{
		// Parse the given date and remove all non-number characters
		// Assuming: "timestamp":"2002-01-08T07:10:59Z" format
		var specificRequest = "rvlimit=max&rvdir=newer&rvprop=ids|timestamp&rvstart=" +
						revisionDate.replace(/[^0-9]/g,'') + "&titles=";
		// Requests the id and timestamp revisions to store in master list
		var wikiAddress = parseAddress(gottenAddress, specificRequest);
	}

	// Get JSON object from given data
	$.ajax({
		dataType: "json",
		type: "GET",
		url: wikiAddress,
		timeout: 60000
	}).then ( function(data)
	{
		// Check if the data we expect exists
		if (data && data.query && data.query.pages) {
			// Cut through the nested json object
			var pages = data.query.pages;
		}
		else {
			// ERROR. No pages returned.
			sendError("Wikipedia article was not found the third time.");
			return;
		}
		// Loop over the one property of data.query.pages
		for (var id in pages)
		{
			if (pages[id].revisions && pages[id].revisions[0] && pages[id].revisions[0]["revid"])
			{
				if(scrapeType == "date")
				{
					// Loop through the json object to find the next revisions
					for( var i = 0; i < pages[id].revisions.length; i++)
					{
						if (pages[id].revisions && pages[id].revisions[i +1] && pages[id].revisions[i +1]["revid"])
						{
							// Change the timestamp of the revision that is after the current one to date format
							// Given a string in the format: 2014-11-26..., parse and store as a date object
							var thisRevisionDate = new Date( pages[id].revisions[i +1]["timestamp"].substring(0, 4),
										(pages[id].revisions[i +1]["timestamp"].substring(5, 7) - 1),
											pages[id].revisions[i +1]["timestamp"].substring(8, 10) );

							// While the date of the next revision is after the calculated date and have not gone past end date
							while( (thisRevisionDate > calcDate) && (endDate >= calcDate) )
							{
								// Store the current revision
								contentArray.push(pages[id].revisions[i]["timestamp"]);
								// Optimization: if more frequent request, get all content now
								if (intervalFreqency < 7)
								{
									// Get content of current revision
									contentArray.push(pages[id].revisions[i]["user"]);
									contentArray.push(pages[id].revisions[i]["*"]);
								}

								// Store the revison timestamp as the last chosen revison timestamp
								revisionDate = pages[id].revisions[i]["timestamp"];

								// re-calculate calcDate for next interval
								var startMiliSec = Date.parse(calcDate) + getMiliseconds(intervalFreqency);
								calcDate.setTime(startMiliSec);
							}
							// If past endDate, return.
							if( endDate < calcDate)
							{
								// Optimization: if have been getting all content go straight to finalContent
								if (intervalFreqency < 7)
								{
									finalContent(contentArray, gottenAddress);
									return;
								}
								else {
									// Update the first progress bar to 100%
									$('#progressBarAll').width('100%');
									// Empty array for storing final content
									var finalArray = new Array();
									// Need to build content from array of timestamps
									buildContent(finalArray, contentArray, gottenAddress, contentArray.length);
									return;
								}
							}
						}
						// If the current revision is the last revision and only revision
						else if (pages[id].revisions && pages[id].revisions[i] &&
									pages[id].revisions[i]["revid"] && (pages[id].revisions.length == 1) ) 
						{
							// While the date of this revision is before the calculated end date: go forever until calcDate passes endDate
							while(endDate >= calcDate)
							{
								// Store the current revision
								contentArray.push(pages[id].revisions[i]["timestamp"]);
								// Optimization: if more frequent request, get all content now
								if (intervalFreqency < 7)
								{
									// Get content of current revision
									contentArray.push(pages[id].revisions[i]["user"]);
									contentArray.push(pages[id].revisions[i]["*"]);
								}

								// Store the revison timestamp as the last chosen revison timestamp
								revisionDate = pages[id].revisions[i]["timestamp"];

								// re-calculate calcDate for next interval
								var startMiliSec = Date.parse(calcDate) + getMiliseconds(intervalFreqency);
								calcDate.setTime(startMiliSec);
							}
							// If past endDate, return.
							if( endDate < calcDate)
							{
								// Optimization: if have been getting all content go straight to finalContent
								if (intervalFreqency < 7)
								{
									finalContent(contentArray, gottenAddress);
									return;
								}
								else {
									// Update the first progress bar to 100%
									$('#progressBarAll').width('100%');
									// Empty array for storing final content
									var finalArray = new Array();
									// Need to build content from array of timestamps
									buildContent(finalArray, contentArray, gottenAddress, contentArray.length);
									return;
								}
							}
						}
						// If the current revision is the last revision of the json object
						else if ( (pages[id].revisions.length -1) == i)
						{
							// Store the revison timestamp as the last chosen revison timestamp
							revisionDate = pages[id].revisions[i]["timestamp"];
							// Do a recursive call and merge with content array
							findNextRevision( revisionDate, intervalFreqency, gottenAddress, calcDate, endDate, contentArray, scrapeType);
							return;
						}
						else
						{
							// ERROR. Something went very wrong.
							sendError("Non-existent revision encountered.");
							return;
						}
					}
				}
				else if(scrapeType == "frequency")
				{
					// Check if the number of revisions returned is less than the interval
					if( (pages[id].revisions.length -1) < parseInt(intervalFreqency, 10) )
					{
						// Optimization: if have been getting all content go straight to finalContent
						if (intervalFreqency < 7)
						{
							finalContent(contentArray, gottenAddress);
							return;
						}
						else {
							// Update the first progress bar to 100%
							$('#progressBarAll').width('100%');
							// Empty array for storing final content
							var finalArray = new Array();
							// Need to build content from array of timestamps
							buildContent(finalArray, contentArray, gottenAddress, contentArray.length);
							return;
						}
					}
					else if( (pages[id].revisions.length -1) >= parseInt(intervalFreqency, 10) )
					{
						// Skip through the json object to find the next revisions
						for( var i = parseInt(intervalFreqency, 10); i < (pages[id].revisions.length -1) ; i = i + parseInt(intervalFreqency, 10) )
						{
							// Change the timestamp of the current revision to date format
							var thisRevisionDate = new Date( pages[id].revisions[i]["timestamp"].substring(0, 4),
									(pages[id].revisions[i]["timestamp"].substring(5, 7) - 1),
										pages[id].revisions[i]["timestamp"].substring(8, 10) );

							// If current revision's date is after endDate, return.
							if( endDate < thisRevisionDate)
							{
								// Optimization: if have been getting all content go straight to finalContent
								if (intervalFreqency < 7)
								{
									finalContent(contentArray, gottenAddress);
									return;
								}
								else {
									// Update the first progress bar to 100%
									$('#progressBarAll').width('100%');
									// Empty array for storing final content
									var finalArray = new Array();
									// Need to build content from array of timestamps
									buildContent(finalArray, contentArray, gottenAddress, contentArray.length);
									return;
								}
							}
							// Store the current revision
							contentArray.push(pages[id].revisions[i]["timestamp"]);
							// Optimization: if more frequent request, get all content now
							if (intervalFreqency < 7)
							{
								// Get content of current revision
								contentArray.push(pages[id].revisions[i]["user"]);
								contentArray.push(pages[id].revisions[i]["*"]);
							}

							// Store the revison timestamp as the last chosen revison timestamp
							revisionDate = pages[id].revisions[i]["timestamp"];
						}
						// Do a recursive call and merge with content array starting with last revision timestamp
						findNextRevision( revisionDate, intervalFreqency, gottenAddress, thisRevisionDate, endDate, contentArray, scrapeType);
						return;
					}
					else
					{
						// ERROR. Something went very, very wrong. Should never reach this error.
						sendError("Incompatible interval and array length type.");
						return;
					}
				}
				else
				{
					// ERROR. Unknown Scrape Type entered. Should never reach this error.
					sendError("Unknown scrape type when searching for revisions.");
					return;
				}
			}
			else {
				// ERROR. No revision content returned.
				sendError("Recursive look for revisions could not find any.");
				return;
			}
		}
	}).fail( function(xmlhttprequest, textstatus, message)
	{
		if(textstatus == "timeout") {
			sendError("Most recent request to Wikipedia timed out.");
		} else {
			sendError(textstatus);
		}
	});
}


/*
 *	Called from findNextRevision
 *	Find the content for each of the timestamps in the contentArray
 */
function buildContent(finalArray, contentArray, gottenAddress, totalRevisions)
{
	// Update progress bar using the length of what is left in the array to be found
	$('#progressBarContent').width( (100 - ((contentArray.length/totalRevisions)*100)) + '%');

	// If contentArray is not empty
	if (contentArray.length > 0)
	{
		// Pop the first item of contentArray and put it into revisionTime
		var revisionTime = contentArray.shift();
	}
	else
	{
		// contentArray is empty, we are done and go to finalContent function for printing out
		finalContent(finalArray, gottenAddress);
		return;
	}

	/*
	 *	Parse the address together: requests data for a single revision
	 *	Uses a limit of one to speed up request and since we are looking for a specific revision
	 *	Uses the default of listing newest revisions first.
	 *	Parse the given date and remove all non-number characters
	 *	Assuming: "timestamp":"2002-01-08T07:10:59Z" format
	 */
	var specificRequest = "rvlimit=1&rvprop=ids|timestamp|user|content&rvstart=" + revisionTime.replace(/[^0-9]/g,'') + "&titles=";
	var specificAddress = parseAddress(gottenAddress, specificRequest);

	// Get JSON object from given data
	$.ajax({
		dataType: "json",
		type: "GET",
		url: specificAddress,
		timeout: 60000
	}).then ( function(data)
	{
		// Check if the data we expect exists
		if (data && data.query && data.query.pages) {
			// Cut through the nested json object
			var pages = data.query.pages;
		}
		else {
			// ERROR. No pages returned.
			sendError("Wikipedia article was not found when searching for a specific revision.");
			return;
		}
		// Loop over the one property of data.query.pages
		for (var id in pages)
		{
			if (pages[id].revisions && pages[id].revisions[0] && pages[id].revisions[0]["revid"])
			{
				// Store the current revision
				finalArray.push(pages[id].revisions[0]["timestamp"]);
				finalArray.push(pages[id].revisions[0]["user"]);
				finalArray.push(pages[id].revisions[0]["*"]);

				// While contentArray is not empty and last stored revision has the same id as the next one
				while ( (pages[id].revisions[0]["revid"] == contentArray[0]) && (contentArray.length > 0) )
				{
					// Store the current revision as it is the same as the next one
					finalArray.push(pages[id].revisions[0]["timestamp"]);
					finalArray.push(pages[id].revisions[0]["user"]);
					finalArray.push(pages[id].revisions[0]["*"]);

					// Remove the first item of contentArray
					contentArray.shift();
				}

				// If contentArray is empty
				if (contentArray.length <= 0)
				{
					// contentArray is empty, we are done and go to finalContent function for printing out
					finalContent(finalArray, gottenAddress);
					return;
				}

				// Recursive call with edited data
				buildContent(finalArray, contentArray, gottenAddress, totalRevisions);
				return;
			}
			else {
				// ERROR. No revision content returned.
				sendError("Second recursive look for revisions could not find any.");
				return;
			}
		}
	}).fail( function(xmlhttprequest, textstatus, message)
	{
		if(textstatus == "timeout") {
			sendError("Last revision request to Wikipedia timed out.");
		} else {
			sendError(textstatus);
		}
	});
}


/*
 *	Called from buildContent or findNextRevision
 *	Make content readable and print to screen
 */
function finalContent(contentArray, gottenAddress)
{
	// Update the first progress bar to 100%
	$('#progressBarAll').width('100%');
	// Update the second progress bar to 100%
	$('#progressBarContent').width('100%');

	// Get title of article from URL part
	var addressArray = gottenAddress.split("/");
	var wikiTitle = addressArray[4];

	// Get the start and end date of the scrape
	var getStartDate = $('#startDate').val();
	var getEndDate = $('#endDate').val();

	if( $('.scrapeTypeRadio:checked').val() == "dateSelected")
	{
		// Get the time interval of the scrape in text
		var timeInterval = $("#oftenDate option:selected").text();
	}
	else if ( $('.scrapeTypeRadio:checked').val() == "frequencySelected")
	{
		// Get the time interval of the scrape in text
		var timeInterval = $("#frequentDate option:selected").text();
	}
	else
	{
		// ERROR. Unknown Scrape Type entered. Should never reach this error.
		sendError("Unknown scrape type printing final results.");
		return;
	}

	// Get the format the user wants
	var getFormat = $('#textFormat').val();
	var getBodyTextFormat = $('#bodyFormat').val();

	// 1 is xml, 2 is human readable, 3 is plain text, 4 is Wikipedia style formatting
	if( getFormat == 1) {
		// Add xml markup
		var finalString = addXML(contentArray, wikiTitle, getStartDate, getEndDate, timeInterval, getBodyTextFormat);
		// Print out final text
		//$('#printOutHere').text(finalString);
		document.getElementById('printOutHere').innerHTML = finalString;
	}
	else if( getFormat == 2) {
		// Make human readable
		var finalString = makeHumanReadable(contentArray, wikiTitle, getStartDate, getEndDate, timeInterval, getBodyTextFormat);
		// Print out final text
		//$('#printOutHere').text(finalString);
		document.getElementById('printOutHere').innerHTML = finalString;
	}
	else {
		// Error
		sendError("There was an error when formatting the output. An unknown request was entered.");
		return;
	}

	// Allow user to select the recently printed text
	$('#selectTextButton').prop('disabled', false);
	// Enable Reset button
	$('#resetButton').prop('disabled', false);

	//Re-enable the form for editing
	enableForm();
	// Hide the progress bars after 800 miliseconds
	setTimeout( function(){ $("#progressBarAllWrapper").slideUp(460)}, 800);
	setTimeout( function(){ $("#progressBarContentWrapper").slideUp(460)}, 800);
}


/*
 *	Add xml markup to resulting array and return a string
 *	Called when final array is finished
 */
function addXML( givenArray, title, startDate, endDate, timeInterval, bodyTextFormat)
{
	// Get current date and time
	var currentDate = new Date();
	// Parse the title
	title = decodeURI(title);
	title = title.replace(/_/g, ' ');
	// Start building string
	// &lt; - code for < sign so html does not replace it and xml does not error
	// &gt; - code for > sign so html does not replace it and xml does not error
	var xmlString = "&lt;?xml version='1.0'?&gt;<br>";
	xmlString = xmlString.concat("&lt;collection&gt;<br>");
	xmlString = xmlString.concat("&lt;header&gt;<br>");
	xmlString = xmlString.concat("&lt;wikipedia_article_title&gt;", title, "&lt;/wikipedia_article_title&gt;<br>");
	xmlString = xmlString.concat("&lt;scrape_time&gt;", currentDate, "&lt;/scrape_time&gt;<br>");
	xmlString = xmlString.concat("&lt;start_scrape_date&gt;", startDate, "&lt;/start_scrape_date&gt;<br>");
	xmlString = xmlString.concat("&lt;end_scrape_date&gt;", endDate, "&lt;/end_scrape_date&gt;<br>");
	xmlString = xmlString.concat("&lt;time_interval&gt;", timeInterval, "&lt;/time_interval&gt;<br>");
	xmlString = xmlString.concat("&lt;/header&gt;<br>");

	for( var i = 0; i < givenArray.length; i++)
	{
		xmlString = xmlString.concat("&lt;version&gt;<br>", "&lt;revision_date&gt;");
		xmlString = xmlString.concat(givenArray[i].substr(0, 10)); // First ten digits are the date
		xmlString = xmlString.concat("&lt;/revision_date&gt;<br>", "&lt;revision_time&gt;");
		xmlString = xmlString.concat(givenArray[i].substr(-10)); // Last ten characters are the time
		xmlString = xmlString.concat("&lt;/revision_time&gt;<br>", "&lt;author&gt;");
		xmlString = xmlString.concat(givenArray[i +1]); // Author
		xmlString = xmlString.concat("&lt;/author&gt;<br>","&lt;body&gt;");
		// If user requested plain text, parse the string, other wise leave it alone. 
		// 3 is plain text, 4 is Wikipedia style formatting
		if( bodyTextFormat == 3) {
			xmlString = xmlString.concat( parseString(givenArray[i +2]) ); // Text body
		}
		else {
			xmlString = xmlString.concat( givenArray[i +2]); // Text body
		}
		xmlString = xmlString.concat("&lt;/body&gt;<br>", "&lt;/version&gt;<br>");
		i = i + 2;
	}
	xmlString = xmlString.concat("&lt;/collection&gt;");
	return xmlString;
}


/*
 *	Add line breaks, and text to resulting array and return a string
 *	Called when final array is finished
 */
function makeHumanReadable( givenArray, title, startDate, endDate, timeInterval, bodyTextFormat)
{
	// Get current date and time
	var currentDate = new Date();
	// Parse the title
	title = decodeURI(title);
	title = title.replace(/_/g, ' ');

	var readableString = "----------------<br>Wikipedia Article: " + title
			+ "<br>----------------<br>Scrape Date: " + currentDate
			+ "<br>----------------<br>Scraping: from " + startDate
			+ " to " + endDate + ", " + timeInterval + "." + "<br>";

	for( var i = 0; i < givenArray.length; i++)
	{
		readableString = readableString.concat("----------------<br>Revision Date: ");
		readableString = readableString.concat(givenArray[i].substr(0, 10)); // First ten digits are the date
		readableString = readableString.concat("<br>----------------<br>Revision Time: ");
		readableString = readableString.concat(givenArray[i].substr(-10)); // Last ten characters are the time
		readableString = readableString.concat("<br>----------------<br>Revision Author: ");
		readableString = readableString.concat(givenArray[i +1]); // Author
		readableString = readableString.concat("<br>----------------<br>Revision Text: ");
		// If user requested plain text, parse the string, other wise leave it alone. 
		// 3 is plain text, 4 is Wikipedia style formatting
		if( bodyTextFormat == 3) {
			readableString = readableString.concat( parseString(givenArray[i +2]), "<br>"); // Text Body
		}
		else {
			readableString = readableString.concat( givenArray[i +2], "<br>"); // Text Body
		}
		i = i + 2;
	}
	return readableString;
}


/*
 *	Called from addXML or makeHumanReadable when adding body text from contentArray
 *	Parse the output before appending to final string
 */
function parseString( wikiContent)
{
	// Clean up string of Wikipedia revisions
	// To preserve quotes, remove {{cquote|
	var parsedContent = wikiContent.replace(/\{+cquote\|/g, '');
	// Remove all text between {{ and }}
	parsedContent = parsedContent.replace(/\{+[^}]+\}+/g, '');	
	// Remove all text between [[ and |
	parsedContent = parsedContent.replace(/\[+([^\]]+)\|+/g, '');
	// Remove final infobox text between | and }}
	parsedContent = parsedContent.replace(/\|+([^\{\}]+)\}+/g, '');
	// Remove text between < and >
	parsedContent = parsedContent.replace(/<+([^<>]+)>+/g, '');
	// Remove &nbsp; and replace it with a standard space
	parsedContent = parsedContent.replace(/&nbsp;/g, ' ');
	// Remove two or more single quotes in a line
	parsedContent = parsedContent.replace(/\'\'+/g, '');
	// Remove all instances of "[["
	parsedContent = parsedContent.replace(/\[\[+/g, '');
	// Remove all instances of "]]"
	parsedContent = parsedContent.replace(/\]\]+/g, '');
	// Remove all instances of "}}"
	parsedContent = parsedContent.replace(/\}\}+/g, '');
	// Replace & with "and" to prevent xml errors
	parsedContent = parsedContent.replace(/\&/g, 'and');
	// Remove all instances of < to prevent xml errors
	parsedContent = parsedContent.replace(/</g, '');
	// Remove all instances of > to prevent xml errors
	parsedContent = parsedContent.replace(/>/g, '');
	// Remove all links in square brackets
	parsedContent = parsedContent.replace(/\[http([^\]]+)\]/g, '');
	// Remove all text after "Bibliography" surrounded by two or more "="
	parsedContent = parsedContent.replace(/\=*\=\s*Bibliography\s*\=\=*(\S|\s)*/gi, '');
	// Remove all text after "References" surrounded by two or more "="
	parsedContent = parsedContent.replace(/\=*\=\s*References\s*\=\=*(\S|\s)*/gi, '');
	// Remove all text after "External links" surrounded by two or more "="
	parsedContent = parsedContent.replace(/\=*\=\s*External links\s*\=\=*(\S|\s)*/gi, '');
	// Remove all text after "See also" surrounded by two or more "="
	parsedContent = parsedContent.replace(/\=*\=\s*See also\s*\=\=*(\S|\s)*/gi, '');
	// Remove all text after "Further reading" surrounded by two or more "="
	parsedContent = parsedContent.replace(/\=*\=\s*Further reading\s*\=\=*(\S|\s)*/gi, '');
	// Remove all instances of "==" or more with line break
	parsedContent = parsedContent.replace(/==+/g, '<br>');
	
	return parsedContent;
}


/*
 *	Called from findFirstRevision, buildContent, findNextRevision
 *	
 *	Parse the wiki address together in json format using the information given
 *
 *	When requesting revisions by id, asking for rvdir=newer returns the very first revisions of that article
 *		and does not start at the specified rvstartid. When listing by id, some articles have a first revision
 *		with a parent id (rather than zero) and causes errors when requesting a specific revision, so
 *		timestamps are used instead.
 *
 *	Wikipedia Address Variables
 *	http://en.wikipedia.org/w/api.php?format=json&action=query&prop=revisions&callback=?
 *		&rvlimit=max&rvdir=newer&rvprop=ids|timestamp|user|content
 *		&rvstart=20141026000000&rvend=20141029000000&titles=Ada_Lovelace
 *	callback=? is for making sure a response comes. (JSONP)
 *	rvlimit=max requests the maximum number of revisions to be returned.
 *	rvdir=newer is the direction to list in.
 *		newer: List oldest revisions first (rvstart has to be lower than rvend)
 *	rvprop=ids|timestamp|user|content is which properties to get for each revision
 *		ids: Get both of these IDs: revid, parentid
 *		timestamp: The date and time the revision was made
 *		user: The user who made the revision, as well as userhidden and anon flags
 *		content: The revision content.
 *	rvstart=yyyymmdd000000 is the date to start looking at. Needs to be earlier than rvend.
 *	rvend=yyyymmdd000000 is the date to stop looking at. Needs to be later than rvend.
 */
function parseAddress(gottenAddress, specificRequest)
{
	/*
	 *	Build the Url to scrape
	 */
	// Standard URL parts for scraping
	var wikiAddressOne = "http://";
	var wikiAddressThree = ".wikipedia.org/w/api.php?format=json&action=query&prop=revisions&callback=?&";

	// Parse language and title from gotten address
	// Assuming a certain form of URL. Example:
	/*	http://en.wikipedia.org/wiki/Ada_Lovelace
	 *	[0] = http:
	 *	[1] = 
	 *	[2] = en.wikipedia.org
	 *	[3] = wiki
	 *	[4] = Ada_Lovelace
	 */
	var addressArray = gottenAddress.split("/");
	var tempLanguage = addressArray[2];
	var languageArray = tempLanguage.split(".");

	// Assign language and title variables
	var wikiAddressLangTwo = languageArray[0];
	var wikiAddressTitleSix = addressArray[4];

	// Concat the address together
	var tempWikiAddress = wikiAddressOne.concat( wikiAddressLangTwo, wikiAddressThree,
				specificRequest, wikiAddressTitleSix);

	// return the full address
	return tempWikiAddress;
}


/*
 *	Called when form elements are changed to check if the given info is valid
 */
function validateInfo()
{
	var errorToggle = false;

	// Grab the full Address
	var tempAddress = $('#wikiAddress').val();
	/*		Regex expression examines if given string starts (^) with
	 *		http followed by 0 to 1 (?) s'es ([s]), followed by a : and // (\/\/),
	 *		followed by two to three ({2,3}) alphabetic characters that form
	 *		the language part of the address. This is followed by the common
	 *		string wikipedia.org/wiki/, and then i to indicate case insenstitive
	 */
	var addressTest = /^http[s]?:\/\/.+\.wikipedia\.org\/wiki\//i;
	// If user has entered a value and URL parts don't match set values, there is an error
	if( (!(addressTest.test(tempAddress)) ) && ($('#wikiAddress').val() != '') )
	{
		$('#submitButton').prop('disabled', true);
		$('#wikiAddressBox').addClass('has-error');
		$('#wikiAddress').data('bs.popover').options.content = "A valid URL of a Wikipedia article must be entered.";
		errorToggle = true;
	}
	else {
		// Reset error messages
		$('#wikiAddressBox').removeClass('has-error');
		$('#wikiAddress').popover('destroy');
		// Initialize error popovers after destruction with timeout function to stall recreating until destruction is done
		setTimeout(function () {
			$('#wikiAddress').popover( {
				placement: "right",
				trigger: "focus hover",
				container: "body"
			});
		}, 200);
		// Update preview with given valid address
		updatePreview();
	}

	// Get start date
	var tempStartDate = $('#startDate').val();
	/*	
	 *	Regex expression examines if given string starts (^) with
	 *		4 digits (\d{4}) (equal to [0-9]), followed by a / (\/),
	 *		followed by two two digit (\d{2}) sections seperarated by a / (\/),
	 *		and must end after the second set of two numbers ($)
	 */
	var dateTest = /^\d{4}\/\d{2}\/\d{2}$/;
	// Testing if start date is valid, if user has entered a value
	if( (!(dateTest.test(tempStartDate))) && ($('#startDate').val() != '') )
	{
		$('#submitButton').prop('disabled', true);
		$('#startDateBox').addClass('has-error');
		$('#startDate').data('bs.popover').options.content = "Start date needs to be in the form yyyy/mm/dd.";
		errorToggle = true;
	}
	else {
		// Reset start date error messages
		$('#startDateBox').removeClass('has-error');
		$('#startDate').popover('destroy');
		// Initialize error popovers after destruction with timeout function to stall recreating until destruction is done
		setTimeout(function () {
			$('#startDate').popover( {
				placement: "right",
				trigger: "focus hover",
				container: "body"
			});
		}, 200);
	}

	// Get end date
	var tempEndDate = $('#endDate').val();

	// Given a string in the format: 2014/11/26, parse and store as a date object
	// Subtract 1 off of month, since month counting starts at zero
	var startDateObj = new Date( tempStartDate.substring(0, 4),
			(tempStartDate.substring(5, 7) - 1), tempStartDate.substring(8, 10) );
	var endDateObj = new Date( tempEndDate.substring(0, 4),
			(tempEndDate.substring(5, 7) - 1), tempEndDate.substring(8, 10) );

	// Testing if end date is valid, if user has entered a value
	if( (!(dateTest.test(tempEndDate))) && ($('#endDate').val() != '') )
	{
		$('#submitButton').prop('disabled', true);
		$('#endDateBox').addClass('has-error');
		$('#endDate').data('bs.popover').options.content = "End date needs to be in the form yyyy/mm/dd.";
		errorToggle = true;
	}
	// Check if end date is later than start date
	else if( (startDateObj >= endDateObj)
		&& ($('#endDate').val() != '') && ($('#startDate').val() != '') )
	{
		$('#submitButton').prop('disabled', true);
		$('#endDateBox').addClass('has-error');
		$('#endDate').data('bs.popover').options.content = "End date must be later than the start date.";
		errorToggle = true;
	}
	else {
		// Reset end date error messages
		$('#endDateBox').removeClass('has-error');
		$('#endDate').popover('destroy');
		// Initialize error popovers after destruction with timeout function to stall recreating until destruction is done
		setTimeout(function () {
			$('#endDate').popover( {
				placement: "right",
				trigger: "focus hover",
				container: "body"
			});
		}, 200);
	}

	// Final check that nothing is empty
	if( ($('#startDate').val() == '') ||
		($('#endDate').val() == '') ||
		($('#wikiAddress').val() == '') )	
	{
		// If anything is empty, do not allow submissions
		$('#submitButton').prop('disabled', true);
		errorToggle = true;
	}

	// If an error has not occured
	if( errorToggle == false)
	{
		// Allow submissions
		$('#submitButton').prop('disabled', false);
		return true;
	}
	else {
		return false;
	}
}


/*
 *	Called from validateInfo
 *	Update the iframe preview with current url
 */
function updatePreview()
{
	// If user has NOT entered a value
	if( $('#wikiAddress').val() == '')
	{
		// Get Wikipedia main page
		$('#previewFrame').prop('src', $('#wikiAddress').prop('placeholder') );
	}
	else if( $('#wikiAddress').val() != '')
	{
		// Update preview with user given value
		$('#previewFrame').prop('src', $('#wikiAddress').val() );
	}
	else {
		// Error occured. Should never reach this error
		sendError("Could not obtain Wikipedia address.");
		return;
	}
}


/*
 *	Called from findNextRevision
 *	Update the progress bar based on how far apart the current date and end date are
 *	using the start date as a reference
 */
function updateProgressBar(currentDate, endDate)
{
	// Grab the start date
	var getStartDate = $('#startDate').val();

	// Given a string in the format: 2014/11/26, parse and store as a date object
	// Subtract 1 off of month, since month counting starts at zero
	var startDateObj = new Date( getStartDate.substring(0, 4),
			(getStartDate.substring(5, 7) - 1), getStartDate.substring(8, 10) );

	// Get the total miliseconds of all the dates
	var startMiliSec = Date.parse(startDateObj);
	var currentMiliSec = Date.parse(currentDate);
	var endMiliSec = Date.parse(endDate);

	// Calculate the percentage that the current date is of the end date
	currentMiliSec = currentMiliSec - startMiliSec;
	endMiliSec = endMiliSec - startMiliSec;
	var calcPercent = (currentMiliSec / endMiliSec) * 100;

	// Update progress bar
	$('#progressBarAll').width(calcPercent + '%');
}


/*
 *	Reset the form, output section, iframe and submit button
 *	When Reset button is clicked
 */
function resetForm()
{
	//Re-enable any disabled form elements and disable submit button
	enableForm();
	// Reset the form
	$("#wikiForm").trigger('reset');
	// Empty the output section
	$('#printOutHere').text('');
	// Disable the select output text button
	$('#selectTextButton').prop('disabled', true);
	// Make sure date panel is visible
	$("#datePanel").slideDown(460);
	$("#frequencyPanel").slideUp(460);
	// Reset preview to Wikipedia main page
	$('#previewFrame').prop('src', $('#wikiAddress').prop('placeholder') );
	// Remove any error messages
	$('#errorOutputAlert').slideUp(460);
	// Use validateInfo to remove all error messages
	validateInfo();
	// Hide the progress bars
	$("#progressBarAllWrapper").slideUp(460);
	$("#progressBarContentWrapper").slideUp(460);
}


/*
 *	Re-enable all form elements for editing
 *	When Reset button is clicked or page is refreshed
 */
function enableForm()
{
	// Enable form elements
	$('.form-control').prop('disabled', false);
	$('#scrapeTypeRadio1').prop('disabled', false);
	$('#scrapeTypeRadio2').prop('disabled', false);
	// Disable submit button
	$('#submitButton').prop('disabled', true);
}


/*
 *	Disable form elements
 *	Called after submit button is pressed
 */
function disableForm()
{
	// Disable form elements
	$('.form-control').prop('disabled', true);
	$('#scrapeTypeRadio1').prop('disabled', true);
	$('#scrapeTypeRadio2').prop('disabled', true);
	// Disable the select output text button
	$('#selectTextButton').prop('disabled', true);
	// Disable submit button
	$('#submitButton').prop('disabled', true);
	// Disable Reset button
	$('#resetButton').prop('disabled', true);
}

/*
 *	Function that shows the given error message when called
 */
 function sendError(errorString)
 {
 	$('#errorOutputAlert').html("<button type='button' class='close alert-close' aria-label='Close'>×</button> <b>Error!</b> " + errorString
 			+ " Please reset the form and try again.");
	$('#errorOutputAlert').slideDown(460);
	// Enable Reset button
	$('#resetButton').prop('disabled', false);
 }


/*
 *	Select all text inside the div which's id is given
 *	Copied from http://stackoverflow.com/a/1173319
 */
function selectAllText(containerid)
{
	if (document.selection)
	{
		var range = document.body.createTextRange();
		range.moveToElementText(document.getElementById(containerid));
		range.select();
	}
	else if (window.getSelection)
	{
		var range = document.createRange();
		range.selectNode(document.getElementById(containerid));
		window.getSelection().addRange(range);
	}
}


/*
 *	Gives the number of miliseconds that occur in the given number of days
 */
function getMiliseconds(numberOfDays)
{
	return ((1000*60*60*24) * numberOfDays);
}