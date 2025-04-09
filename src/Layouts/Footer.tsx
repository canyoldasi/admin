import React from 'react';
import { Col, Container, Row } from 'reactstrap';

const Footer = () => {
    return (
        <React.Fragment>
            <footer className="footer d-none">
                <Container fluid>
                    <Row>
                        <Col sm={6}>
                            {new Date().getFullYear()} © Agiletech.
                        </Col>
                        <Col sm={6}>
                            <div className="text-sm-end d-none d-sm-block">
                                Design & Develop by Agiletech
                            </div>
                        </Col>
                    </Row>
                </Container>
            </footer>
        </React.Fragment>
    );
};

export default Footer;