$ = require('jquery');
var Diff = require('text-diff');

function left_nodename_cmp(a,b) {
    var x = a.report.left_nodename;
    var y = b.report.left_nodename;
    var val = 0;
    if (x < y) { val = -1; }
    if (x > y) { val = 1; }
    return val;
}

$(document).ready(function() {
    var src='mismatch_report.json';
    var output = $('#output');
    $.ajax({
        url: src
    }).done(function(data) {
        var report_i, report, leftName, rightName, diff, textDiff, para;
        data.LTR.mismatch_reports.sort(left_nodename_cmp);
        output.append($("<span>").text("Left-to-right: you have " + data.LTR.nmismatches + " mismatches"));
        for (report_i in data.LTR.mismatch_reports) {
            report = data.LTR.mismatch_reports[report_i].report;
            leftName = report.left_nodename;
            rightName = report.best_match_in_right_for_left.target;
            diff = new Diff();
            textDiff = diff.main(leftName,rightName);
            diff.cleanupSemantic(textDiff);
            para = $("<p>").addClass("text-diff");
            para.append($("<span>").text("left: " + leftName + " --> "));
            para.append(diff.prettyHtml(textDiff) );
            para.append($("<span>").text("---> " + rightName + ": right"));

            this_distance = report.match_ratings[0].levenshtein_distance;
            next_distance = report.match_ratings[1].levenshtein_distance;
            para.append($("<span>").text("? " + this_distance + " < " + next_distance + " ?"));

            if (this_distance < next_distance) {
                para.append($("<span>").text(" BEST MATCH "));
            }
            else {
                para.append($("<span>").text(" AMBIGUOUS "));
            }

            output.append(para);
        }
        output.append($("<span>").text("Right-to-left: you have " + data.RTL.nmismatches + " mismatches"));
        data.RTL.mismatch_reports.sort(left_nodename_cmp);
        for (report_i in data.RTL.mismatch_reports) {
            report = data.RTL.mismatch_reports[report_i].report;
            leftName = report.left_nodename;
            rightName = report.best_match_in_right_for_left.target;
            diff = new Diff();
            textDiff = diff.main(leftName,rightName);
            diff.cleanupSemantic(textDiff);
            para = $("<p>").addClass("text-diff");
            para.append($("<span>").text("left: " + leftName + " --> "));
            para.append(diff.prettyHtml(textDiff) );
            para.append($("<span>").text("---> " + rightName + ": right"));

            this_distance = report.match_ratings[0].levenshtein_distance;
            next_distance = report.match_ratings[1].levenshtein_distance;
            para.append($("<span>").text("? " + this_distance + " < " + next_distance + " ?"));

            if (this_distance < next_distance) {
                para.append($("<span>").text(" BEST MATCH "));
            }
            else {
                para.append($("<span>").text(" AMBIGUOUS "));
            }
            output.append(para);
        }
    });
});
