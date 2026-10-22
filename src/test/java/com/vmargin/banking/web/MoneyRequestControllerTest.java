package com.vmargin.banking.web;

import com.vmargin.banking.model.BankAccount;
import com.vmargin.banking.model.User;
import com.vmargin.banking.service.AccountService;
import com.vmargin.banking.service.MoneyRequestService;
import com.vmargin.banking.service.SavedRecipientService;
import java.math.BigDecimal;
import java.sql.SQLException;
import java.time.LocalDateTime;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.redirectedUrl;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(MoneyRequestController.class)
@Import(SecurityConfiguration.class)
class MoneyRequestControllerTest {
    @Autowired private MockMvc mvc;
    @MockBean private SessionAccounts sessions;
    @MockBean private AccountService accounts;
    @MockBean private SavedRecipientService recipients;
    @MockBean private MoneyRequestService requests;
    private MockHttpSession session;
    private User payer;

    @BeforeEach
    void setup() throws Exception {
        session = new MockHttpSession();
        payer = new User(1, "09990000001", "REDACTED", "Demo Payer",
            new BankAccount("ACC-1", "Demo Payer", new BigDecimal("100.00")));
        when(sessions.current(any())).thenReturn(payer);
    }

    private PendingMoneyRequestPayment review(String token) {
        return new PendingMoneyRequestPayment(7, 3, token, "payment-reference",
            LocalDateTime.now().plusMinutes(5));
    }

    @Test
    void staleConfirmationPreservesNewerReviewWithoutPaying() throws Exception {
        PendingMoneyRequestPayment newer = review("new-token");
        session.setAttribute(MoneyRequestController.PENDING_PAYMENT, newer);

        mvc.perform(post("/money-requests/pay/confirm").session(session).with(user("1")).with(csrf())
                .param("token", "old-token"))
            .andExpect(redirectedUrl("/request"));

        assertSame(newer, session.getAttribute(MoneyRequestController.PENDING_PAYMENT));
        verify(requests, never()).pay(any(), anyLong(), anyLong(), any());
    }

    @Test
    void confirmationClaimsReviewBeforePayAndDoesNotRemoveReplacementReview() throws Exception {
        PendingMoneyRequestPayment pending = review("confirmed-token");
        PendingMoneyRequestPayment replacement = review("replacement-token");
        session.setAttribute(MoneyRequestController.PENDING_PAYMENT, pending);
        when(requests.pay(payer, 7, 3, pending.paymentReference())).thenAnswer(invocation -> {
            assertNull(session.getAttribute(MoneyRequestController.PENDING_PAYMENT));
            session.setAttribute(MoneyRequestController.PENDING_PAYMENT, replacement);
            return new BigDecimal("80.00");
        });

        mvc.perform(post("/money-requests/pay/confirm").session(session).with(user("1")).with(csrf())
                .param("token", pending.token()))
            .andExpect(redirectedUrl("/request"));
        assertSame(replacement, session.getAttribute(MoneyRequestController.PENDING_PAYMENT));

        mvc.perform(post("/money-requests/pay/confirm").session(session).with(user("1")).with(csrf())
                .param("token", pending.token()))
            .andExpect(redirectedUrl("/request"));
        assertSame(replacement, session.getAttribute(MoneyRequestController.PENDING_PAYMENT));
        verify(requests, times(1)).pay(payer, 7, 3, pending.paymentReference());
    }

    @Test
    void expiredReviewAndMissingCsrfCannotPay() throws Exception {
        PendingMoneyRequestPayment expired = new PendingMoneyRequestPayment(7, 3, "expired-token",
            "payment-reference", LocalDateTime.now().minusMinutes(1));
        session.setAttribute(MoneyRequestController.PENDING_PAYMENT, expired);
        mvc.perform(post("/money-requests/pay/confirm").session(session).with(user("1"))
                .param("token", expired.token()))
            .andExpect(status().isForbidden());
        assertSame(expired, session.getAttribute(MoneyRequestController.PENDING_PAYMENT));

        mvc.perform(post("/money-requests/pay/confirm").session(session).with(user("1")).with(csrf())
                .param("token", expired.token()))
            .andExpect(redirectedUrl("/request"));
        assertNull(session.getAttribute(MoneyRequestController.PENDING_PAYMENT));
        verify(requests, never()).pay(any(), anyLong(), anyLong(), any());
    }

    @Test
    void staleReviewPageCannotDiscardAReplacementInstalledDuringLookup() throws Exception {
        PendingMoneyRequestPayment pending = review("old-page-token");
        PendingMoneyRequestPayment replacement = review("new-page-token");
        session.setAttribute(MoneyRequestController.PENDING_PAYMENT, pending);
        when(requests.pendingIncoming(payer, pending.requestId())).thenAnswer(invocation -> {
            session.setAttribute(MoneyRequestController.PENDING_PAYMENT, replacement);
            return Optional.empty();
        });

        mvc.perform(get("/money-requests/pay/review").session(session).with(user("1")))
            .andExpect(redirectedUrl("/request"));

        assertSame(replacement, session.getAttribute(MoneyRequestController.PENDING_PAYMENT));
        verify(requests, never()).pay(any(), anyLong(), anyLong(), any());
    }

    @Test
    void databaseFailureConsumesClaimAndCannotReplayIt() throws Exception {
        PendingMoneyRequestPayment pending = review("failing-token");
        session.setAttribute(MoneyRequestController.PENDING_PAYMENT, pending);
        when(requests.pay(payer, 7, 3, pending.paymentReference())).thenThrow(new SQLException("test failure"));
        for (int attempt = 0; attempt < 2; attempt++) {
            mvc.perform(post("/money-requests/pay/confirm").session(session).with(user("1")).with(csrf())
                    .param("token", pending.token()))
                .andExpect(redirectedUrl("/request"));
        }
        assertNull(session.getAttribute(MoneyRequestController.PENDING_PAYMENT));
        verify(requests, times(1)).pay(payer, 7, 3, pending.paymentReference());
    }
}
