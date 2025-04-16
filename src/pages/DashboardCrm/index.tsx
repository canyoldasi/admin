import React from 'react';
import { Container, Card, CardBody, CardHeader, Row, Col, Table } from 'reactstrap';
import { Link } from 'react-router-dom';
import BreadCrumb from '../../Components/Common/BreadCrumb';
import ReactApexChart from "react-apexcharts";
import getChartColorsArray from "../../Components/Common/ChartsDynamicColor";

const BasicColumn = ({dataColors}:any) => {
    var chartColumnColors = getChartColorsArray(dataColors);
    const series = [
        {
            name: "2024",
            data: [125.45, 145.78, 165.56, 185.34, 205.67, 225.89, 245.78, 265.34, 285.56, 305.45, 325.67, 345.89],
        },
        {
            name: "2025",
            data: [365.56, 385.34, 405.45, 425.78, 445.89, 465.67, 485.34, 505.56, 525.45, 545.78, 565.89, 585.67],
        },
        {
            name: "2026",
            data: [605.34, 625.56, 645.45, 665.78, 685.67, 705.89, 725.34, 745.56, 765.45, 785.78, 805.89, 825.67],
        },
        {
            name: "2027",
            data: [845.56, 865.45, 885.78, 905.67, 925.89, 945.34, 965.56, 985.45, 1005.78, 1025.89, 1045.67, 1065.34],
        },
        {
            name: "2028",
            data: [1085.45, 1105.78, 1125.56, 1145.34, 1165.67, 1185.89, 1205.78, 1225.34, 1245.56, 1265.45, 1285.67, 1305.89],
        }
    ];

    var options = {
        chart: {
            height: 350,
            type: 'bar',
            toolbar: {
                show: false,
            }
        },
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '45%',
                endingShape: 'rounded'
            },
        },
        dataLabels: {
            enabled: false
        },
        stroke: {
            show: true,
            width: 2,
            colors: ['transparent']
        },
        colors: chartColumnColors,
        xaxis: {
            categories: ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'],
        },
        yaxis: {
            title: {
                text: 'Bağış Miktarı (Bin TL)'
            },
            labels: {
                formatter: function (val:any) {
                    return val + " TL";
                }
            }
        },
        grid: {
            borderColor: '#f1f1f1',
        },
        fill: {
            opacity: 1
        },
        tooltip: {
            y: {
                formatter: function (val:any) {
                    return val + " TL";
                }
            }
        }
    };

    return (
        <ReactApexChart dir="ltr" className="apex-charts"
            series={series}
            options={options}
            type="bar"
            height={350}
        />
    );
};

const BasicLine = ({dataColors}:any) => {
    var chartLineColors = getChartColorsArray(dataColors);
    const series = [{
        name: "Günlük Bağış",
        data: [
            1250, 1850, 2200, 1750, 2100, 2450, 1950, 2300, 2650, 2150, 2500, 2850,
            2350, 2700, 3050, 2550, 2900, 3250, 2750, 3100, 3450, 2950, 3300, 3650,
            3150, 3500, 3850, 3350, 3700, 4050, 3550
        ]
    }];

    var options = {
        chart: {
            height: 350,
            type: 'line',
            toolbar: {
                show: false,
            }
        },
        stroke: {
            width: [3],
            curve: 'smooth'
        },
        colors: chartLineColors,
        xaxis: {
            categories: Array.from({length: 31}, (_, i) => (i + 1).toString()),
            title: {
                text: 'Gün'
            }
        },
        yaxis: {
            title: {
                text: 'Bağış Miktarı (TL)'
            },
            labels: {
                formatter: function (val:any) {
                    return val.toLocaleString('tr-TR') + " TL";
                }
            }
        },
        tooltip: {
            y: {
                formatter: function (val:any) {
                    return val.toLocaleString('tr-TR') + " TL";
                }
            }
        }
    };

    return (
        <ReactApexChart dir="ltr" className="apex-charts"
            series={series}
            options={options}
            type="line"
            height={350}
        />
    );
};

const ColumnWithDataLabels = ({dataColors}:any) => {
    var chartColumnColors = getChartColorsArray(dataColors);
    const series = [{
        name: "Günlük Bağış",
        data: [
            117104, 112200.53, 277540.09, 203042.26, 282318.87, 
            257504, 282967.45, 141407, 145451.79, 190230.59, 
            180395, 239682.05, 1311821.36, 445962.19, 186136.65, 
            81537.93, 216552.84, 122452.64, 133746.15, 231712.25, 
            200218.45, 206369.78, 93280, 170858.84, 76407.36
        ]
        
    }];

    var options = {
        chart: {
            height: 300,
            type: 'bar',
            toolbar: {
                show: false,
            }
        },
        plotOptions: {
            bar: {
                borderRadius: 0,
                dataLabels: {
                    position: 'top',
                },
            }
        },
        dataLabels: {
            enabled: false
        },
        colors: chartColumnColors,
        xaxis: {
            categories: Array.from({length: 31}, (_, i) => (i + 1).toString()),
            position: 'bottom',
            axisBorder: {
                show: false
            },
            axisTicks: {
                show: false
            }
        },
        yaxis: {
            axisBorder: {
                show: false
            },
            axisTicks: {
                show: false,
            },
            labels: {
                show: true,
                formatter: function (val:any) {
                    return val.toLocaleString('tr-TR') + " TL";
                }
            }
        },
        tooltip: {
            y: {
                formatter: function (val:any) {
                    return val.toLocaleString('tr-TR') + " TL";
                }
            }
        }
    };

    return (
        <ReactApexChart dir="ltr" className="apex-charts"
            series={series}
            options={options}
            type="bar"
            height={200}
        />
    );
};

const Home = () => {
    document.title="Ana Sayfa | Can Yoldaşı Derneği";
    return (
        <React.Fragment>
            <style>
                {`
                    .toplam {
                        color: green!important;
                        font-weight: bold;
                    }
                    table#aylikbagis tr td:nth-child(even),
                    table#kurbanrapor tr td:nth-child(even) {
                        background-color: #f3f3f3;
                    }
                    table tr td {
                        text-align: right;
                    }
                    table tr th {
                        text-align: right;
                    }
                    table tr th:first-child {
                        text-align: left;
                    }
                    table#aylikbagis tr th {
                        text-align: center;
                    }
                `}
            </style>
            <div className="page-content">
                <Container fluid>                            
                    <BreadCrumb title="Ana Sayfa" pageTitle="Dashboards" />
                    <Row>
                        <Col xl={2}>
                            <Card>
                                <CardHeader>
                                    <h4 className="card-title mb-0">Tüm Bağışlar</h4>
                                </CardHeader>
                                <CardBody>
                                    <div className="table-responsive">
                                        <Table className="align-middle table-nowrap mb-0">
                                            <tbody>
                                                <tr>
                                                    <th scope="row">Bugün</th>
                                                    <td>92.750 TL</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">Dün</th>
                                                    <td>92.750 TL</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">Bu Hafta</th>
                                                    <td>92.750 TL</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">Bu Ay</th>
                                                    <td>1.875.420 TL</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">Bu Yıl</th>
                                                    <td>14.325.680 TL</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row" className="toplam">Toplam</th>
                                                    <td className="toplam">45.678.950 TL</td>
                                                </tr>
                                            </tbody>
                                        </Table>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                        <Col xl={2}>
                            <Card>
                                <CardHeader>
                                    <h4 className="card-title mb-0">Kredi Kartı Bağış</h4>
                                </CardHeader>
                                <CardBody>
                                    <div className="table-responsive">
                                        <Table className="align-middle table-nowrap mb-0">
                                            <tbody>
                                                <tr>
                                                    <th scope="row">Bugün</th>
                                                    <td>38.450 TL</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">Dün</th>
                                                    <td>38.450 TL</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">Bu Hafta</th>
                                                    <td>38.450 TL</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">Bu Ay</th>
                                                    <td>875.320 TL</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">Bu Yıl</th>
                                                    <td>7.845.670 TL</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row" className="toplam">Toplam</th>
                                                    <td className="toplam">28.456.780 TL</td>
                                                </tr>
                                            </tbody>
                                        </Table>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                        <Col xl={2}>
                            <Card>
                                <CardHeader>
                                    <h4 className="card-title mb-0">Banka Bağış</h4>
                                </CardHeader>
                                <CardBody>
                                    <div className="table-responsive">
                                        <Table className="align-middle table-nowrap mb-0">
                                            <tbody>
                                                <tr>
                                                    <th scope="row">Bugün</th>
                                                    <td>54.300 TL</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">Dün</th>
                                                    <td>54.300 TL</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">Bu Hafta</th>
                                                    <td>54.300 TL</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">Bu Ay</th>
                                                    <td>1.000.100 TL</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">Bu Yıl</th>
                                                    <td>6.480.010 TL</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row" className="toplam">Toplam</th>
                                                    <td className="toplam">17.222.170 TL</td>
                                                </tr>
                                            </tbody>
                                        </Table>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                        <Col xl={2}>
                            <Card>
                                <CardHeader>
                                    <h4 className="card-title mb-0">Kurban</h4>
                                </CardHeader>
                                <CardBody>
                                    <div className="table-responsive">
                                        <Table className="align-middle table-nowrap mb-0">
                                            <tbody>
                                                <tr>
                                                    <th scope="row">Bugün</th>
                                                    <td>15</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">Dün</th>
                                                    <td>15</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">Bu Hafta</th>
                                                    <td>15</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">Bu Ay</th>
                                                    <td>245</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">Bu Yıl</th>
                                                    <td>1.875</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row" className="toplam">Toplam</th>
                                                    <td className="toplam">5.678</td>
                                                </tr>
                                            </tbody>
                                        </Table>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                        <Col xl={2}>
                            <Card>
                                <CardHeader>
                                    <h4 className="card-title mb-0">Üye</h4>
                                </CardHeader>
                                <CardBody>
                                    <div className="table-responsive">
                                        <Table className="align-middle table-nowrap mb-0">
                                            <tbody>
                                                <tr>
                                                    <th scope="row">Bugün</th>
                                                    <td>48</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">Dün</th>
                                                    <td>48</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">Bu Hafta</th>
                                                    <td>48</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">Bu Ay</th>
                                                    <td>1.875</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">Bu Yıl</th>
                                                    <td>12.450</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row" className="toplam">Toplam</th>
                                                    <td className="toplam">27.890</td>
                                                </tr>
                                            </tbody>
                                        </Table>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                        <Col xl={2}>
                            <Card>
                                <CardHeader>
                                    <h4 className="card-title mb-0">Vacip Kurban</h4>
                                </CardHeader>
                                <CardBody>
                                    <div className="table-responsive">
                                        <Table className="align-middle table-nowrap mb-0">
                                        <thead>
                                                <tr>
                                                    <th></th>
                                                    <th scope="row">Küçükbaş</th>
                                                    <th scope="row">Büyükbaş</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <th scope="row">2024</th>
                                                    <td>1.000</td>
                                                    <td>2.000</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">2025</th>
                                                    <td>1.000</td>
                                                    <td>2.000</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">2026</th>
                                                    <td>1.000</td>
                                                    <td>2.000</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">2027</th>
                                                    <td>1.000</td>
                                                    <td>2.000</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">2028</th>
                                                    <td>1.000</td>
                                                    <td>2.000</td>
                                                </tr>
                                            </tbody>
                                        </Table>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                        <Col xl={12}>
                            <Card>
                                <CardHeader>
                                    <h4 className="card-title mb-0">Günlük Bağış Grafiği</h4>
                                </CardHeader>
                                <CardBody>
                                    <ColumnWithDataLabels dataColors='["--vz-primary"]'/>
                                </CardBody>
                            </Card>
                        </Col>
                        <Col xl={12}>
                            <Card>
                                <CardHeader>
                                    <h4 className="card-title mb-0">Aylık Bağışlar</h4>
                                </CardHeader>
                                <CardBody>
                                    <div className="table-responsive">
                                        <Table id="aylikbagis" className="align-middle table-nowrap mb-0">
                                            <thead>
                                                <tr>
                                                    <th></th>
                                                    <th scope="row">Ocak</th>
                                                    <th scope="row">Şubat</th>
                                                    <th scope="row">Mart</th>
                                                    <th scope="row">Nisan</th>
                                                    <th scope="row">Mayıs</th>
                                                    <th scope="row">Haziran</th>
                                                    <th scope="row">Temmuz</th>
                                                    <th scope="row">Ağustos</th>
                                                    <th scope="row">Eylül</th>
                                                    <th scope="row">Ekim</th>
                                                    <th scope="row">Kasım</th>
                                                    <th scope="row">Aralık</th>
                                                    <th scope="row" className="toplam">Toplam</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <th scope="row">2024</th>
                                                    <td>125.450 TL</td>
                                                    <td>145.780 TL</td>
                                                    <td>165.560 TL</td>
                                                    <td>185.340 TL</td>
                                                    <td>205.670 TL</td>
                                                    <td>225.890 TL</td>
                                                    <td>245.780 TL</td>
                                                    <td>265.340 TL</td>
                                                    <td>285.560 TL</td>
                                                    <td>305.450 TL</td>
                                                    <td>325.670 TL</td>
                                                    <td>345.890 TL</td>
                                                    <td className="toplam">12.456.123 TL</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">2025</th>
                                                    <td>365.560 TL</td>
                                                    <td>385.340 TL</td>
                                                    <td>405.450 TL</td>
                                                    <td>425.780 TL</td>
                                                    <td>445.890 TL</td>
                                                    <td>465.670 TL</td>
                                                    <td>485.340 TL</td>
                                                    <td>505.560 TL</td>
                                                    <td>525.450 TL</td>
                                                    <td>545.780 TL</td>
                                                    <td>565.890 TL</td>
                                                    <td>585.670 TL</td>
                                                    <td className="toplam">22.356.123 TL</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">2026</th>
                                                    <td>605.340 TL</td>
                                                    <td>625.560 TL</td>
                                                    <td>645.450 TL</td>
                                                    <td>665.780 TL</td>
                                                    <td>685.670 TL</td>
                                                    <td>705.890 TL</td>
                                                    <td>725.340 TL</td>
                                                    <td>745.560 TL</td>
                                                    <td>765.450 TL</td>
                                                    <td>785.780 TL</td>
                                                    <td>805.890 TL</td>
                                                    <td>825.670 TL</td>
                                                    <td className="toplam">38.456.123 TL</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">2027</th>
                                                    <td>845.560 TL</td>
                                                    <td>865.450 TL</td>
                                                    <td>885.780 TL</td>
                                                    <td>905.670 TL</td>
                                                    <td>925.890 TL</td>
                                                    <td>945.340 TL</td>
                                                    <td>965.560 TL</td>
                                                    <td>985.450 TL</td>
                                                    <td>1.005.780 TL</td>
                                                    <td>1.025.890 TL</td>
                                                    <td>1.045.670 TL</td>
                                                    <td>1.065.340 TL</td>
                                                    <td className="toplam">48.456.123 TL</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">2028</th>
                                                    <td>1.085.450 TL</td>
                                                    <td>1.105.780 TL</td>
                                                    <td>1.125.560 TL</td>
                                                    <td>1.145.340 TL</td>
                                                    <td>1.165.670 TL</td>
                                                    <td>1.185.890 TL</td>
                                                    <td>1.205.780 TL</td>
                                                    <td>1.225.340 TL</td>
                                                    <td>1.245.560 TL</td>
                                                    <td>1.265.450 TL</td>
                                                    <td>1.285.670 TL</td>
                                                    <td>1.305.890 TL</td>
                                                    <td className="toplam">58.456.123 TL</td>
                                                </tr>
                                            </tbody>
                                        </Table>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                        
                        <Col xl={12}>
                            <Card>
                                <CardHeader>
                                    <h4 className="card-title mb-0">Yıllık Bağış Grafiği</h4>
                                </CardHeader>
                                <CardBody>
                                    <BasicColumn dataColors='["#1E3A8A", "#6B8E23", "#FFD700", "#800000"]'/>
                                </CardBody>
                            </Card>
                        </Col>
                        <Col xl={12}>
                            <Card>
                                <CardHeader>
                                    <h4 className="card-title mb-0">Aylık Kurban Bağışları</h4>
                                </CardHeader>
                                <CardBody>
                                    <div className="table-responsive">
                                        <Table id="kurbanrapor" className="align-middle table-nowrap mb-0">
                                            <thead>
                                                <tr>
                                                    <th></th>
                                                    <th scope="row">Ocak</th>
                                                    <th scope="row">Şubat</th>
                                                    <th scope="row">Mart</th>
                                                    <th scope="row">Nisan</th>
                                                    <th scope="row">Mayıs</th>
                                                    <th scope="row">Haziran</th>
                                                    <th scope="row">Temmuz</th>
                                                    <th scope="row">Ağustos</th>
                                                    <th scope="row">Eylül</th>
                                                    <th scope="row">Ekim</th>
                                                    <th scope="row">Kasım</th>
                                                    <th scope="row">Aralık</th>
                                                    <th scope="row" className="toplam">Toplam</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr>
                                                    <th scope="row">2024</th>
                                                    <td>1</td>
                                                    <td>45</td>
                                                    <td>12</td>
                                                    <td>23</td>
                                                    <td>10</td>
                                                    <td>15</td>
                                                    <td>20</td>
                                                    <td>25</td>
                                                    <td>30</td>
                                                    <td>35</td>
                                                    <td>40</td>
                                                    <td>45</td>
                                                    <td className="toplam">1567</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">2025</th>
                                                    <td>1</td>
                                                    <td>45</td>
                                                    <td>12</td>
                                                    <td>23</td>
                                                    <td>10</td>
                                                    <td>15</td>
                                                    <td>20</td>
                                                    <td>25</td>
                                                    <td>30</td>
                                                    <td>35</td>
                                                    <td>40</td>
                                                    <td>45</td> 
                                                    <td className="toplam">1567</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">2026</th>
                                                    <td>1</td>
                                                    <td>45</td>
                                                    <td>12</td>
                                                    <td>23</td>
                                                    <td>10</td>
                                                    <td>15</td>
                                                    <td>20</td>
                                                    <td>25</td>
                                                    <td>30</td>
                                                    <td>35</td>
                                                    <td>40</td>
                                                    <td>45</td>
                                                    <td className="toplam">1567</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">2027</th>
                                                    <td>1</td>
                                                    <td>45</td>
                                                    <td>12</td>
                                                    <td>23</td>
                                                    <td>10</td>
                                                    <td>15</td>
                                                    <td>20</td>
                                                    <td>25</td>
                                                    <td>30</td>
                                                    <td>35</td>
                                                    <td>40</td>
                                                    <td>45</td>
                                                    <td className="toplam">1567</td>
                                                </tr>
                                                <tr>
                                                    <th scope="row">2028</th>
                                                    <td>1</td>
                                                    <td>45</td>
                                                    <td>12</td>
                                                    <td>23</td>
                                                    <td>10</td>
                                                    <td>15</td>
                                                    <td>20</td>
                                                    <td>25</td>
                                                    <td>30</td>
                                                    <td>35</td>
                                                    <td>40</td>
                                                    <td>45</td>
                                                    <td className="toplam">1567</td>
                                                </tr>
                                            </tbody>
                                        </Table>
                                    </div>
                                </CardBody>
                            </Card>
                        </Col>
                    </Row>
                </Container>
            </div>
        </React.Fragment>
    );
};

export default Home; 