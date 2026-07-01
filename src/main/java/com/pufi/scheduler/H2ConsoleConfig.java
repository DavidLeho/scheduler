package com.pufi.scheduler;

import org.h2.server.web.JakartaWebServlet;
import org.springframework.boot.web.servlet.ServletRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * H2 web console konfiguráció.
 *
 * Normál esetben a Spring Boot automatikusan elérhetővé tudja tenni
 * a H2 console-t a spring.h2.console.enabled=true beállítással.
 *
 * Ennél a projektnél viszont a /h2-console útvonalat kézzel regisztráljuk,
 * hogy biztosan működjön böngészőből:
 *
 * http://localhost:8080/h2-console
 *
 * Ez csak fejlesztéshez kell, hogy könnyen rá lehessen nézni az adatbázisra.
 * Éles rendszerben ezt majd ki kell venni vagy védeni kell.
 */
@Configuration
public class H2ConsoleConfig {

    @Bean
    public ServletRegistrationBean<JakartaWebServlet> h2ConsoleServlet() {
        ServletRegistrationBean<JakartaWebServlet> registrationBean =
                new ServletRegistrationBean<>(new JakartaWebServlet(), "/h2-console/*");

        registrationBean.setLoadOnStartup(1);

        return registrationBean;
    }
}