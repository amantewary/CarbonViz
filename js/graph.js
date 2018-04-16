/**
 * JS file for loading data and drawing maps and graphs.
 */

/**
 * Implementing One-Page-Scroll
 * *https://github.com/peachananr/onepage-scroll
 */

$(document).ready(function() {
  $(".main").onepage_scroll({
    sectionContainer: "section",
    responsiveFallback: false,
    loop: true,
    easing: "ease-in-out",
    direction: "horizontal"
  });
});

/**
 * Loading TopoJSON and datasets.
 * *TopoJSON Source: https://unpkg.com/world-atlas@1.1.4/world/50m.json
 */

d3
  .queue()
  .defer(d3.json, "./data/50m.json")
  .defer(d3.csv, "./data/new_data.csv", function(row) {
    return {
      continent: row.Continent,
      country: row.Country,
      countryCode: row["Code"],
      Emissions: +row["CO2 Emissions"],
      PerCapita: +row["CO2 Emissions Per Capita"],
      PerGDP: +row["CO2 Emissions Per $1 GDP"],
      region: row.Region,
      year: +row.Year
    };
  })
  .await(function(error, mapData, emmissionData) {
    if (error) throw error;

    var yearEndpoints = d3.extent(emmissionData, function(d) {
      return d.year;
    });
    var selectedYear = yearEndpoints[0];
    var selectedData = d3
      .select('input[name="dataSets"]:checked')
      .attr("value");
    var topoData = topojson.feature(mapData, mapData.objects.countries)
      .features;

    var width = 900;
    var height = 600;

    /**
     * Creating SVG for each graph.
     */

    mapGraph(width, height);
    pieChart(width, height);
    barGraph(width, height);

    /**
     * Drawing the graphs.
     */

    mapGraphFunction(topoData, emmissionData, selectedYear, selectedData);
    pieChartFunction(emmissionData, selectedYear, selectedData);
    barGraphFunction(emmissionData, selectedData, "");

    /**
     * 1. Initilizing range slider.
     * 2. On Input event listener is used to get the year from
     *    the range slider and pass it to the map and graph drawing funcitons.
     */

    d3
      .select("#year")
      .property("min", selectedYear)
      .property("max", yearEndpoints[1])
      .property("value", selectedYear)
      .on("input", function() {
        selectedYear = +d3.event.target.value;
        mapGraphFunction(topoData, emmissionData, selectedYear, selectedData);
        pieChartFunction(emmissionData, selectedYear);
        selectedBars(selectedYear);
      });

    /**
     * The current dataset is grabed from dataset selector
     * and passing it to map and bar graph drawing function.
     */

    d3.selectAll('input[name="dataSets"]').on("change", () => {
      var active = d3.select(".active").data()[0];
      var country = active ? active.properties.country : "";
      selectedData = d3.event.target.value;
      mapGraphFunction(topoData, emmissionData, selectedYear, selectedData);
      barGraphFunction(emmissionData, selectedData, country);
    });

    /**
     * 1. Initializing tooltip.
     * 2. Re-drawing tooltips on mousemove for the map or
     *    graph in focus.
     */
    d3.selectAll("svg").on("mousemove touchmove", reDrawTooltip);

    function reDrawTooltip() {
      var ttSVG = d3.select(".tooltip");
      var current = d3.select(d3.event.target);
      var isMapGraph = current.classed("country");
      var isBarGraph = current.classed("bar");
      var isPieChart = current.classed("arc");
      var dataset = d3.select("input:checked").property("value");
      if (dataset === "Emissions") {
        var units = "thousand metric tonnes";
      } else if (dataset === "PerCapita") {
        var units = "metric tonnes per capita";
      } else {
        var units = "kg CO2 per $1 GDP";
      }
      var d;
      var percentageOfTotal = "";
      if (isMapGraph) d = current.data()[0].properties;
      if (isPieChart) {
        d = current.data()[0].data;
        percentageOfTotal = `<p>Percentage of total: ${getPercentage(
          current.data()[0]
        )}</p>`;
      }
      if (isBarGraph) d = current.data()[0];
      ttSVG
        .style("opacity", +(isMapGraph || isPieChart || isBarGraph))
        .style("left", d3.event.pageX - ttSVG.node().offsetWidth / 2 + "px")
        .style("top", d3.event.pageY - ttSVG.node().offsetHeight - 10 + "px");
      if (d) {
        var dValue = d[dataset]
          ? d[dataset].toLocaleString() + " " + units
          : "Data Unavailable";
        ttSVG.html(`
              <p>Country: ${d.country}</p>
              <p>${formatdataset(dataset)}: ${dValue}</p>
              <p>Year: ${d.year || d3.select("#year").property("value")}</p>
              ${percentageOfTotal}
            `);
      }
    }
  });

function formatdataset(z) {
  if (z === "Emissions") {
    return "Emissions";
  } else if (z === "PerCapita") {
    return "Emissions Per Capita";
  } else {
    return "Emissions Per $ GDP";
  }
}
/**
 * Function for getting percentage of the total emission of any
 * particular country for diplying it on piechart tooltip.
 */

function getPercentage(data) {
  var a = data.endAngle - data.startAngle;
  var pCent = 100 * a / (Math.PI * 2);
  return pCent.toFixed(2) + "%";
}

/**
 * Setting up SVG for map.
 * @param width - Default Width of The SVG
 * @param height - Default height of the SVG
 */

function mapGraph(width, height) {
  var svg = d3
    .select("#topoMap")
    .attr("width", width)
    .attr("height", height);

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", "1em")
    .attr("font-size", "1.5em")
    .style("text-anchor", "middle")
    .classed("map-title", true);
}

/**
 * Setting up SVG for Pie Chart
 * @param width - Default Width of the SVG.
 * @param height - Default Height of the SVG.
 */

function pieChart(width, height) {
  var svg = d3
    .select("#pieChart")
    .attr("width", width)
    .attr("height", height);

  svg
    .append("g")
    .attr(
      "transform",
      "translate(" + width / 2 + ", " + (height / 2 + 10) + ")"
    )
    .classed("chart", true);

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", "1.7em")
    .attr("font-size", "1.5em")
    .style("text-anchor", "middle")
    .classed("pie-title", true);
}

/**
 * Setting up SVG for Bar Graph.
 * @param width - Default width of the SVG
 * @param height - Default height of the SVG
 */

function barGraph(width, height) {
  var svg = d3
    .select("#barGraph")
    .attr("width", width / 1.05)
    .attr("height", height / 1.4);

  svg.append("g").classed("x-axis", true);

  svg.append("g").classed("y-axis", true);

  svg
    .append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 3)
    .attr("dy", "0.8em")
    .style("text-anchor", "middle")
    .style("font-size", "1em")
    .classed("y-axis-label", true);

  svg
    .append("text")
    .attr("x", width / 2)
    .attr("y", "1em")
    .attr("font-size", "1.5em")
    .style("text-anchor", "middle")
    .classed("bar-title", true);
}

/**
 * Highlighting the bar for current year.
 * @param year - Year selected using timeline slider
 */

function selectedBars(year) {
  d3
    .select("#barGraph")
    .selectAll("rect")
    .attr("fill", function(d) {
      return d.year === year ? "rgb(255,0,0)" : "rgb(241,196,15)";
    });
}

/**
 * Function for drawing the map
 * * Referred Here for creating a map: https://bost.ocks.org/mike/map/
 * @param topoData  - Topology objects
 * @param emissionData - Current emission data for intial load.
 * @param selectedYear - Year selected using timeline slider
 * @param selectedData - Dataset selected using dataset selector.
 */

function mapGraphFunction(topoData, emissionData, selectedYear, selectedData) {
  var svg = d3.select("#topoMap");

  var projection = d3
    .geoMercator()
    .scale(130)
    .translate([+svg.attr("width") / 2, +svg.attr("height") / 1.4]);

  var path = d3.geoPath().projection(projection);

  d3.select("#year-val").text(selectedYear);

  topoData.forEach(function(d) {
    var cSelect = emissionData.filter(function(row) {
      return row.countryCode === d.id;
    });
    var name = "";
    if (cSelect.length > 0) name = cSelect[0].country;
    d.properties = cSelect.find(function(c) {
      return c.year === selectedYear;
    }) || { country: name };
  });

  var paint = [
    "rgb(90,174,214)",
    "rgb(6,146,198)",
    "rgb(8,48,107)",
    "rgb(8,45,80)"
  ];

  var dataScaling = {
    Emissions: [0, 250000, 1000000, 5000000],
    PerCapita: [0, 0.5, 2, 10],
    PerGDP: [0, 0.5, 1, 2.5]
  };

  var mapScale = d3
    .scaleLinear()
    .domain(dataScaling[selectedData])
    .range(paint);

  var reDraw = svg.selectAll(".country").data(topoData);

  reDraw
    .enter()
    .append("path")
    .classed("country", true)
    .attr("d", path)
    .on("mouseover", function(d) {
      d3.select(this).style("opacity", 0.8);
    })
    .on("mouseout", function(d) {
      d3.select(this).style("opacity", 1);
    })
    .on("click", function() {
      var currentdataset = d3.select("input:checked").property("value");
      var thisCountry = d3.select(this);
      var isSelected = thisCountry.classed("active");
      var name = isSelected ? "" : thisCountry.data()[0].properties.country;
      barGraphFunction(emissionData, currentdataset, name);
      selectedBars(+d3.select("#year").property("value"));
      d3.selectAll(".country").classed("active", false);
      thisCountry.classed("active", !isSelected);
    })
    .merge(reDraw)
    .transition()
    .duration(750)
    .attr("fill", function(d) {
      var v = d.properties[selectedData];
      return v ? mapScale(v) : "rgb(204,204,204)";
    });

  d3
    .select(".map-title")
    .text("Carbon dioxide " + mapHeading(selectedData) + ", " + selectedYear);
}

function mapHeading(str) {
  if (str === "Emissions") {
    return "Emissions";
  } else if (str === "PerCapita") {
    return "Emissions Per Capita";
  } else {
    return "Emissions Per $ GDP";
  }
}

/**
 * Function for drawing the bar graph
 * @param emissionData - Current emission data for intial load.
 * @param selectedData - Dataset selected using dataset selector
 * @param selectedCountry - The name of the country selected on the map
 */
function barGraphFunction(emissionData, selectedData, selectedCountry) {
  var svg = d3.select("#barGraph");
  var margin = {
    top: 30,
    right: 30,
    bottom: 30,
    left: 110
  };
  d3.select("#country-val").text(selectedCountry);
  var barPadding = 1;
  var width = +svg.attr("width");
  var height = +svg.attr("height");
  var cData = emissionData
    .filter(function(d) {
      return d.country === selectedCountry;
    })
    .sort(function(a, b) {
      return a.year - b.year;
    });

  var x = d3
    .scaleLinear()
    .domain(
      d3.extent(emissionData, function(d) {
        return d.year;
      })
    )
    .range([margin.left, width - margin.right]);

  var y = d3
    .scaleLinear()
    .domain([
      0,
      d3.max(cData, function(d) {
        return d[selectedData];
      })
    ])
    .range([height - margin.bottom, margin.top]);

  var barWidth = x(x.domain()[0] + 1) - x.range()[0];

  var axisX = d3.axisBottom(x).tickFormat(d3.format(".0f"));

  d3
    .select(".x-axis")
    .attr("transform", "translate(0, " + (height - margin.bottom) + ")")
    .call(axisX);

  var axisY = d3.axisLeft(y);

  d3
    .select(".y-axis")
    .attr("transform", "translate(" + (margin.left - barWidth / 2) + ",0)")
    .transition()
    .duration(2000)
    .call(axisY);

  if (selectedData === "Emissions") {
    var yLabel = "thousand metric tonnes";
  } else if (selectedData === "PerCapita") {
    var yLabel = "metric tonnes per capita";
  } else {
    var yLabel = "kg CO2 per $1 GDP";
  }

  if (selectedCountry) {
    if (selectedData === "Emissions") {
      var barHeader = "Carbon Dioxide Emissions, " + selectedCountry;
    } else if (selectedData === "PerCapita") {
      var barHeader = "Carbon Dioxide Emissions Per Capita, " + selectedCountry;
    } else {
      var barHeader = "Carbon Dioxide Emissions Per $ GDP, " + selectedCountry;
    }
  } else {
    var barHeader = "Click on a country";
  }

  d3.select(".y-axis-label").text(yLabel);

  d3.select(".bar-title").text(barHeader);

  var t = d3
    .transition()
    .duration(2000)
    .ease(d3.easeBounceOut);

  var reDraw = svg.selectAll(".bar").data(cData);

  reDraw
    .exit()
    .transition(t)
    .delay(function(d, i, nodes) {
      return (nodes.length - i - 1) * 100;
    })
    .attr("y", height - margin.bottom)
    .attr("height", 0)
    .remove();

  reDraw
    .enter()
    .append("rect")
    .classed("bar", true)
    .attr("y", height - margin.bottom)
    .attr("height", 0)
    .merge(reDraw)
    .attr("x", function(d) {
      return (x(d.year) + x(d.year - 1)) / 2;
    })
    .attr("width", barWidth - barPadding)
    .transition(t)
    .delay(function(d, i) {
      return i * 100;
    })
    .attr("y", function(d) {
      return y(d[selectedData]);
    })
    .attr("height", function(d) {
      return height - margin.bottom - y(d[selectedData]);
    });
}

/**
 * Function for drawing Bars
 * @param emissionData - Current emission data for intial load.
 * @param currentYear - Year selected using timeline slider
 * @param selectedData - Dataset selected using dataset selector.
 */

function pieChartFunction(emissionData, currentYear, selectedData) {
  var svg = d3.select("#pieChart");

  var pie = d3
    .pie()
    .sort(function(a, b) {
      if (a.continent < b.continent) return -1;
      if (a.continent > b.continent) return 1;
      return a.Emissions - b.Emissions;
    })
    .value(function(d) {
      return d.Emissions;
    });

  var arcs = d3
    .arc()
    .outerRadius(+svg.attr("height") / 2 - 50)
    .innerRadius(0);
  var hover = d3
    .arc()
    .outerRadius(+svg.attr("height") / 2)
    .innerRadius(0);

  var selectedYear = emissionData.filter(function(d) {
    return d.year === currentYear;
  });
  var landArea = [];
  for (var i = 0; i < selectedYear.length; i++) {
    var land = selectedYear[i].continent;
    if (!landArea.includes(land)) {
      landArea.push(land);
    }
  }

  var paint = d3
    .scaleOrdinal()
    .domain(landArea)
    .range([
      "rgb(255,112,67)",
      "rgb(100,221,23)",
      "rgb(3,155,229)",
      "rgb(224,64,251)",
      "rgb(255,23,68)"
    ]);

  var reDraw = svg
    .select(".chart")
    .selectAll(".arc")
    .data(pie(selectedYear));

  reDraw.exit().remove();

  reDraw
    .enter()
    .append("path")
    .classed("arc", true)
    .attr("stroke", "rgb(223,241,255)")
    .attr("stroke-width", "0.2px")
    .on("mouseover", function(d) {
      d3
        .select(this)
        .attr("stroke", "white")
        .transition()
        .duration(1000)
        .attr("d", hover)
        .attr("stroke-width", 2);
    })
    .on("mouseout", function(d) {
      d3
        .select(this)
        .transition()
        .attr("d", arcs)
        .attr("stroke", "rgb(223,241,255)")
        .attr("stroke-width", "0.5px");
    })
    .merge(reDraw)
    .attr("fill", function(d) {
      return paint(d.data.continent);
    })
    .attr("d", arcs);

  svg
    .select(".pie-title")
    .text("Total Emissions by continent and region, " + currentYear);
}
